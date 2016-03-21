import {Origin} from 'aurelia-metadata';
import {Container} from 'aurelia-dependency-injection';
import {CompositionEngine, ViewSlot} from 'aurelia-templating';
import {DialogController} from './dialog-controller';
import {Renderer} from './renderers/renderer';
import {invokeLifecycle} from './lifecycle';

/**
 * A service allowing for the creation of dialogs.
 * @constructor
 */
export class DialogService {
  static inject = [Container, CompositionEngine, Renderer];

  constructor(container: Container, compositionEngine, renderer) {
    this.container = container;
    this.compositionEngine = compositionEngine;
    this.renderer = renderer;
  }

  /**
   * Opens a new dialog.
   * @param settings Dialog settings for this dialog instance.
   * @return Promise A promise that settles when the dialog is closed.
   */
  open(settings?: Object) {
    let _settings = Object.assign({}, this.renderer.defaultSettings, settings);

    return new Promise((resolve, reject) => {
      let childContainer = this.container.createChild();
      let dialogController = new DialogController(this.renderer, _settings, resolve, reject);
      let instruction = {
        viewModel: _settings.viewModel,
        container: this.container,
        childContainer: childContainer,
        model: _settings.model
      };

      childContainer.registerInstance(DialogController, dialogController);

      return this._getViewModel(instruction).then(returnedInstruction => {
        dialogController.viewModel = returnedInstruction.viewModel;

        return invokeLifecycle(returnedInstruction.viewModel, 'canActivate', _settings.model).then(canActivate => {
          if (canActivate) {
            return this.compositionEngine.createController(returnedInstruction).then(controller => {
              dialogController.controller = controller;
              dialogController.view = controller.view;
              controller.automate();

              dialogController.slot = new ViewSlot(this.renderer.getDialogContainer(), true);
              dialogController.slot.add(dialogController.view);

              return this.renderer.showDialog(dialogController);
            });
          }
        });
      });
    });
  }

  _getViewModel(instruction) {
    if (typeof instruction.viewModel === 'function') {
      instruction.viewModel = Origin.get(instruction.viewModel).moduleId;
    }

    if (typeof instruction.viewModel === 'string') {
      return this.compositionEngine.ensureViewModel(instruction);
    }

    return Promise.resolve(instruction);
  }
}
