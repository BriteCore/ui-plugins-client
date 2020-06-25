import Postmate from 'postmate';
import WaitNotify from 'wait-notify';
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
  constructor(options) {
    this.options = options
  }

  /**
   * Return the plugin options. Implement this method only if you need to
   * post-process the options to prepare them to be shared with BriteCore.
   * @returns {object}
   */
  getOptions() {
    return this.options
  }

  /**
   * Extract the interface from the options passed to the Plugin.
   * Returns the data and functions from the options the plugin wants to
   * expose to BriteCore.
   * @returns {object}
   */
  getModel() {
    return {}
  }

  /**
   * Handle any updates to the context passed into the plugin.
   * @param context an Object representing the state passed into the plugin.
   */
  handleContextUpdate(context, parent) {
    this.lastContext = context
    this.parent = parent
  }
}

/**
 * After BriteCore UI handles a plugin's request, this function is called to
 * handle the response.
 *
 * Stores response in corresponding response slot and wakes the asynchronous request function
 * that initiated the request.
 *
 * @param {object} - Contains slotIndex and response passed from the BriteCore UI.
 */
function handleResponse({ slotIndex, response }) {
  let slot = ResponseSlots.get(slotIndex)

  if (slot) {
    slot.response = response
    slot.waitNotify.notify()
    return
  }

  throw new Error("Response slot missing")
}

/**
 * After BriteCore UI handles a plugin's request, this function is called to
 * handle the error.
 *
 * Stores error in corresponding response slot and wakes the asynchronous request function
 * that initiated the request.
 *
 * @param {object} - Contains slotIndex and error passed from the BriteCore UI.
 */
function handleError({ slotIndex, error }) {
  let slot = ResponseSlots.get(slotIndex)

  if (slot) {
    slot.error = error
    slot.waitNotify.notify()
    return
  }

  throw new Error("Response slot missing")
}

class ButtonRowHandler extends PluginHandler {
  /**
   * Return a modified version of this.options, where the button callbacks
   * are replaced by their names. This way the buttons can be passed on
   * events emitted to BriteCore UI.
   *
   * Originally, `this.options` looks like:
   *  { buttons: [{ label: 'Click here', callback: foo }] }
   *
   * And will be transformed into:
   * {
   *   buttons: [{
   *     label: 'Click here',
   *     callback: 'foo',
   *     handleResponse: 'handleResponse',
   *     handleError: 'handleError'
   *   }]
   * }
   *
   * @returns {object}
   */
  getOptions(context) {
    return {
      ...this.options,
      buttons: this.options.buttons.map((button) => {
        return {
          ...button,
          callback: button.callback.name,
          visible:
            context && button.visible ? button.visible(context) : false,
          enabled:
            context && button.enabled ? button.enabled(context) : true,
        };
      }),
    };
  }

  /**
   * Extract the callbacks from the buttons passed as options to the plugin,
   * add `handleError` and `handleResponse` to the callbacks
   * and return them in an object to be used as the plugin model.
   * @returns {object}
   */
  getModel() {
    let callbacks = this.options.buttons
      .map(btn => btn.callback)
      .concat([handleError, handleResponse])

    let obj = Object.fromEntries(callbacks.map(cb => [cb.name, cb]))

    return obj
  }

  handleContextUpdate(context, parent) {
    super.handleContextUpdate(context, parent)

    let buttons = this.getOptions(context).buttons
    parent.emit("buttons-updated", buttons)
  }
}


class BriteCorePlugin {
  handlers = {
    'button-row': ButtonRowHandler
  }

  initialize(options) {
    let contextUpdate = (context) => {
      for (let key of Object.keys(this.pluginHandlers)) {
        let handler = this.pluginHandlers[key]
        handler.handleContextUpdate(context, this.parent)
      }
    }

    let model = {"contextUpdate": contextUpdate}
    let modifiedOptions = {}
    this.pluginHandlers = {}

    for (let key of Object.keys(options)) {
      let handler = new this.handlers[key](options[key])
      this.pluginHandlers[key] = handler

      model = { ...model, ...handler.getModel() }
      modifiedOptions[key] = {
        handleResponse: handleResponse.name,
        handleError: handleError.name,
        ...handler.getOptions()
      }
    }

    const handshake = new Postmate.Model(model)

    // When parent <-> child handshake is complete, events may be emitted to the parent
    handshake.then(parent => {
      this.parent = parent

      for (let key of Object.keys(modifiedOptions)) {
        let eventName = 'initialized-' + key
        parent.emit(eventName, modifiedOptions[key])
      }
    })
  }
}

/**
 * BriteCorePlugin is a simple Axios-like utility for making BriteAuth-authenticated
 * requests.
 */
class BriteCorePluginRequest {
  /**
   * BriteCorPluginRequest instance is initialized with a postmate object representing
   * the child iframe.
   *
   * @param {object} child - PostMate ChildAPI object
   */
  constructor(child) {
    this.child = child
  }

  /**
   * An helper function for initiating requests.
   *
   * It waits for a response or error from BriteCore UI and resumes when
   * a corresponding reponse or error is available.
   *
   * @param {string} method - The method of the request.
   * @param {object} data - Object containing arguments Axios expects.
   */
  async makeRequest(method, data) {
    const waitNotify = new WaitNotify()
    const slotIndex = ResponseSlots.create(waitNotify)

    this.child.emit('request', {
      request: { method, ...data },
      slotIndex
    })

    await waitNotify.wait()

    const { response, error } = ResponseSlots.get(slotIndex)

    ResponseSlots.remove(slotIndex)

    if (error) {
      throw error
    }

    return response
  }

  async get(url, config) {
    return await this.makeRequest('get', { url, config })
  }

  async post(url, data, config) {
    return await this.makeRequest('post', { url, data, config })
  }

  async put(url, data, config) {
    return await this.makeRequest('put', { url, data, config })
  }

  async patch(url, data, config) {
    return await this.makeRequest('patch', { url, data, config })
  }

  async options(url, data, config) {
    return await this.makeRequest('options', { url, config })
  }

  async delete(url, data, config) {
    return await this.makeRequest('delete', { url, config })
  }
}

/**
 * ResponseSlots is data structure for storing information about each request so that
 * when a request reponse arrives, the async function that initiated the request
 * resumes and gets the response or error returned from handling the request.
 *
 * `index` is a number that always increases and it is used to give each request a unique key.
 * This assumes that a user (tab) session will never initiate more than 9007199254740991 (MAX_SAFE_INTEGER) requests.
 */
class ResponseSlots {
  static slots = {}
  static index = 0

  /**
   * Allocates a slot for a request
   * @param {object} waitNotify - The notifier for resuming an asynchronous request function.
   * @returns
   */
  static create(waitNotify) {
    const slotIndex = ++ResponseSlots.index

    ResponseSlots.slots[slotIndex] = {
      waitNotify,
      response: null,
      error: null,
    }

    return slotIndex
  }

  /**
   * Gets a slot with `index` as key.
   * @param {number} index - The slot key.
   */
  static get(index) {
    return ResponseSlots.slots[index]
  }

  /**
   * Removes a slot with `index` as key.
   * @param {number} index - The slot key.
   */
  static remove(index) {
    delete ResponseSlots.slots[index]
  }
}

window.BriteCorePluginRequest = BriteCorePluginRequest
window.BriteCorePlugin = BriteCorePlugin
export default BriteCorePlugin;
