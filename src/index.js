import { connectToParent } from "penpal"
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
export class PluginHandler {

  /**
   * Build a handler to deal with a given type of Plugin Slot.
   * @param options an Object with the plugin configuration (varies on a plugin basis).
   */
  constructor(options) {
    // extract onContextUpdate if it is passed in the options
    const {onContextUpdate, ...modifiedOptions} = options
    if (onContextUpdate && typeof onContextUpdate === "function") {
      this.onContextUpdate = onContextUpdate
    }
    this.options = modifiedOptions
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
    if (this.onContextUpdate && typeof this.onContextUpdate === "function") {
      this.onContextUpdate(context, parent)
    }
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

  throw new Error('Response slot missing')
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

  throw new Error('Response slot missing')
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
   *     text: 'Click here',
   *     callback: 'foo',
   *     handleResponse: 'handleResponse',
   *     handleError: 'handleError'
   *   }]
   * }
   *
   * @returns {object}
   */
  getOptions(context) {
    const options = {
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

    return options
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
    if (parent.updateButtons) {
      parent.updateButtons(buttons)
    }
  }
}

class AutoCompleteHandler extends PluginHandler {
  getModel() {
    let callbacks = [handleResponse, handleError]
    for (const input of this.options.inputs) {
      callbacks.push(input.querySearch, input.handleSelect)
    }

    let obj = Object.fromEntries(callbacks.map(cb => [cb.name, cb]))

    return obj
  }

  getOptions() {
    return {
      ...this.options,
      inputs: this.options.inputs.map((input) => {
        return {
          ...input,
          querySearch: input.querySearch.name,
          handleSelect: input.handleSelect.name
        };
      }),
    };
  }
}


class MarkupHandler extends PluginHandler {
  
  getModel() {
    return {
      ...this.options.methods,
      handleResponse,
      handleError
    } || {}
  }

  getOptions() {
    const defaultOptions = {
      template: '',
      methods: {},
      data: {}
    }
    return {
      ...defaultOptions,
      ...this.options,
      template: `<div>${this.options.template || defaultOptions.template}</div>`,
      methods: Object.keys(this.getModel()),
      handleResponse: 'handleResponse', // from 'handleResponse' function in PluginHandler,
      handleError: 'handleError' // from 'handleError' function in PluginHandler
    };
  }
}


class AutoRunHandler extends PluginHandler {
  getOptions() {
    return  {
      ...this.options,
      launchers: this.options.launchers.map((launcher) => ({
        ...launcher,
        callback: launcher.callback.name
      })),
    };
  }

  getModel() {
    let callbacks = this.options.launchers
      .map(launcher => launcher.callback)
      .concat([handleError, handleResponse])

    return Object.fromEntries(callbacks.map(cb => [cb.name, cb]))
  }
}


class BriteCorePlugin {

  constructor(name) {
    this.name = name
  }

  handlers = {
    'button-row': ButtonRowHandler,
    'auto-complete': AutoCompleteHandler,
    'markup': MarkupHandler,
    'auto-run': AutoRunHandler
  }

  
  /**
   * Combines all methods from all handlers as well as common methods.
   */
  getExposedMethods(options) {
    let contextUpdate = (_, context) => {
      for (let key of Object.keys(options)) {
        let handler = new this.handlers[key](options[key])
        handler.handleContextUpdate(context, this.parent)
      }
    }

    let methods = {contextUpdate}
    
    for (let key of Object.keys(options)) {
      if (!this.handlers[key]) {
        throw new Error(`${key} is not a valid option`)
      }
      let handler = new this.handlers[key](options[key])
      methods = { ...methods, ...handler.getModel() }
    }
    return methods

  }

  async initialize(options) {
    let model = this.getExposedMethods(options)
    
    const connection = connectToParent({
      methods: model
    })
    
    const extraHandlerOptions = {
      pluginName: this.name,
      handleResponse: handleResponse.name,
      handleError: handleError.name
    }

    const parent = await connection.promise
    this.parent = parent
    model.parent = parent
    const {handler: handlerKey, context} = await parent.getSlotInfo()
    let modifiedOptions = {}
    let handler = new this.handlers[handlerKey](options[handlerKey])
    modifiedOptions[handlerKey] = {
      ...extraHandlerOptions,
      ...handler.getOptions(context)
    }
    parent.initializeSlot(modifiedOptions[handlerKey])
    return parent
  }
}

/**
 * BriteCorePlugin is a simple Axios-like utility for making BriteAuth-authenticated
 * requests.
 */
class BriteCorePluginRequest {
  /**
   * BriteCorPluginRequest instance is initialized with a Penpal object representing
   * the parent iframe.
   *
   * @param {object} parent - a Penpal object representing the parent iframe.
   */
  constructor(parent, pluginName) {
    this.parent = parent
    this.pluginName = pluginName
  }

  /**
   * A helper function for initiating requests the the datamapping service.
   *
   * It waits for a response or error from BriteCore UI and resumes when
   * a corresponding response or error is available.
   *
   * @param {string} from - The name of the service being mapped from.
   * @param {string} to - The name of the service being mapped to.
   * @param {object} data - The data payload to be mapped.
   * @param {string} mode - Mode to use.
   */
  async makeMappingRequest(from, to, data, mode = 'default') {
   const url = `/datamapping/map/?from=${from}&to=${to}&mode=${mode}`
   const payload = {
      url,
      data
    }
    return await this.makeRequest('post', payload, 'mapping')
  }

  /**
   * A helper function for initiating requests.
   *
   * It waits for a response or error from BriteCore UI and resumes when
   * a corresponding response or error is available.
   *
   * @param {string} method - The method of the request.
   * @param {object} data - Object containing arguments Axios expects.
   */
  async makeRequest(method, data, type = 'integration') {
    const waitNotify = new WaitNotify()
    const slotIndex = ResponseSlots.create(waitNotify)

    this.parent.makeRequest({
      request: { method, type, ...data },
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
 * when a request response arrives, the async function that initiated the request
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
export {BriteCorePlugin, BriteCorePluginRequest, ButtonRowHandler, AutoCompleteHandler, MarkupHandler, AutoRunHandler};
