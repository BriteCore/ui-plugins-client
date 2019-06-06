import Postmate from 'postmate';

/**
 * An abstract class that has to be implemented by Plugin Handlers.
 *
 * A Plugin Handler is just an object used by plugins to communicate with
 * the plugins slots available in the UI.
 *
 * For each kind of plugin slot available in the UI, we need to implement a
 * PluginHandler that will be used to read the plugin settings and expose the
 * interface that the plugin has to expose with the plugin slot.
 */
class PluginHandler {

  /**
   * Build a handler to deal with a given type of Plugin Slot.
   * @param options an Object with the plugin configuration (varies on a plugin basis).
   */
  constructor (options) {
    this.options = options
  }

  /**
   * Return the plugin options. Implement this method only if you need to
   * post-process the options to prepare them to be shared with BriteCore.
   * @returns {object}
   */
  getOptions () {
    return this.options
  }

  /**
   * Extract the interface from the options passed to the Plugin.
   * Returns the data and functions from the options the plugin wants to
   * expose to BriteCore.
   * @returns {object}
   */
  getModel () {
    return {}
  }
}

class ButtonRowHandler extends PluginHandler {
  /**
   * Return a modified version of this.options, where the button callbacks
   * are replaced by their names. This way the buttons can be passed on
   * events emitted to BriteCore UI.
   *
   * Originally, `this.options` looks like:
   *  { buttons: [{ label: 'Click here', callback: doSomething }] }
   *
   * And will be transformed into:
   *  { buttons: [{ label: 'Click here', callback: 'doSomething' }] }
   *
   * @returns {object}
   */
  getOptions () {
    for (let button of this.options.buttons) {
      button.callback = button.callback.name
    }
    return this.options
  }

  /**
   * Extract the callbacks from the buttons passed as options to the plugin
   * and return them in an object to be used as the plugin model.
   * @returns {object}
   */
  getModel () {
    let callbacks = this.options.buttons.map(btn => btn.callback)
    return Object.fromEntries(callbacks.map(cb => [cb.name, cb]))
  }
}

class BriteCorePlugin {

  handlers = {
    'button-row': ButtonRowHandler
  }

  initialize (options) {
    let model = {}
    for (let key of Object.keys(options)) {
      let handler = new this.handlers[key](options[key])
      model = {...model, ...handler.getModel()}
      options[key] = handler.getOptions()
    }

    const handshake = new Postmate.Model(model)

    // When parent <-> child handshake is complete, events may be emitted to the parent
    handshake.then(parent => {
      for (let key of Object.keys(options)) {
        let eventName = 'initialized-' + key
        parent.emit(eventName, options[key])
      }
    })
  }
}

window.BriteCorePlugin = BriteCorePlugin
export default BriteCorePlugin;
