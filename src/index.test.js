import { connectToParent } from 'penpal'
import { AutoCompleteHandler, BriteCorePlugin, ButtonRowHandler, MarkupHandler, PluginHandler, AutoRunHandler } from './index'

jest.mock("penpal")

const fakeParent = ({
  showLoadingIndicator: jest.fn(),
  updateRisk: jest.fn(),
  displayErrors: jest.fn(),
  getSlotInfo: jest.fn().mockReturnValue({handler: 'button-row', context: {}}),
  initializeSlot: jest.fn(),
  makeRequest: jest.fn(),
})

describe('BriteCorePlugin', () => {
  const firstButtonCallback = () => { }
  const secondButtonCallback = () => { }
  connectToParent.mockImplementation(() => ({ promise: jest.fn().mockResolvedValue(fakeParent) }));
  let p = new BriteCorePlugin()
  const pluginOptions = {
    'button-row': {
      buttons: [{
        text: 'Button 1',
        callback: firstButtonCallback
      }, {
        text: 'Button 2',
        callback: secondButtonCallback
      }
      ]
    }
  }
  p.initialize(pluginOptions)
  const penpalCallArgs = connectToParent.mock.calls[0][0]

  it('should call `connectToParent` method from penpal', () => {
    expect(connectToParent).toHaveBeenCalledTimes(1)
  });

  it('should have button-row handler', () => {
    expect(p).toHaveProperty("handlers")
    expect(p.handlers).toHaveProperty("button-row")
  });

  it('should expose the request handlers (handleResponse, handleError) to the parent Iframe.', () => {
    expect(penpalCallArgs).toHaveProperty("methods")
    expect(penpalCallArgs.methods).toHaveProperty("handleResponse")
    expect(penpalCallArgs.methods).toHaveProperty("handleError")
  });

  it('should expose the contextUpdate handler method to the parent Iframe', () => {
    expect(penpalCallArgs.methods).toHaveProperty("contextUpdate")
  });

  it('should expose the buttons callbacks to the Parent Iframe', () => {
    expect(penpalCallArgs.methods).toHaveProperty("firstButtonCallback")
    expect(penpalCallArgs.methods).toHaveProperty("secondButtonCallback")
  });

  it('`getExposedMethods` should throw an error if you pass an invalid option', () => {
    const init = () => {p.getExposedMethods({'invalid-key': {}})}
    expect(init).toThrowError(new Error('invalid-key is not a valid option'))
  })
});

describe('PluginHandler', () => {


  it('should accept `onContextUpdate` function as an option and call it whenever the context changes', () => {
    let onContextUpdateMock = jest.fn()
    const options = {
      onContextUpdate: onContextUpdateMock
    }
    let pluginHandler = new PluginHandler(options)
    pluginHandler.handleContextUpdate({}, fakeParent)
    expect(onContextUpdateMock).toHaveBeenCalled()
    onContextUpdateMock.mockReset()
    pluginHandler = new PluginHandler({})
    pluginHandler.handleContextUpdate({}, fakeParent)
    expect(onContextUpdateMock).toBeCalledTimes(0)
  })
})

describe('ButtonRowHandler', () => {
  const buttonCallback1 = () => {}
  const buttonCallback2 = () => {}
  const mockButton1 = {
    text: "Button 1",
    callback: buttonCallback1,
    visible: () => false,
    enabled: () => true,
  }

  const mockButton2 = {
    text: "Button 2",
    callback: buttonCallback2,
    visible: () => false,
    enabled: () => true,
  }
  
  const handler = new ButtonRowHandler({buttons: [mockButton1, mockButton2]})
  const options = handler.getOptions()

  test('`getOptions` should return replace any method with its name', () => {
    expect(options.buttons[0].callback).toBe('buttonCallback1')
  });

  test('`getOptions` should return visible function with its returned value', () => {
    expect(options.buttons[0].visible).toBe(false)
  });

  test('`getOptions` should return enabled function with its returned value', () => {
    expect(options.buttons[0].enabled).toBe(true)
  });

  test('`getModel` extracts buttons callbacks and append request handlers', () => {
    const model = handler.getModel()
    expect(model).toHaveProperty('buttonCallback1', buttonCallback1)
    expect(model).toHaveProperty('buttonCallback2', buttonCallback2)
    expect(model).toHaveProperty('handleResponse')
    expect(typeof model.handleResponse).toBe('function')
    expect(model).toHaveProperty('handleError')
    expect(typeof model.handleError).toBe('function')
  })

  test('`handleContextUpdate` updates buttons on the parent', () => {
    const mockContext = {}
    const mockParent = {
      updateButtons: jest.fn()
    }
    handler.handleContextUpdate(mockContext, mockParent)
    expect(mockParent.updateButtons).toHaveBeenLastCalledWith(handler.getOptions().buttons)
  })
})

describe('AutoCompleteHandler', () => {
  const querySearch1 = () => {}
  const handleSelect1 = () => {}
  const querySearch2 = () => {}
  const handleSelect2 = () => {}
  
  const mockInput1 = {
    placeholder: "first autocomplete",
    querySearch: querySearch1,
    handleSelect: handleSelect1,
    prefixIcon: ["far", "search"],
    triggerOnFocus: true
  }

  const mockInput2 = {
    placeholder: "second autocomplete",
    querySearch: querySearch2,
    handleSelect: handleSelect2,
    prefixIcon: ["far", "search"],
    triggerOnFocus: true
  }
  
  const handler = new AutoCompleteHandler({inputs: [mockInput1, mockInput2]})
  const options = handler.getOptions()
  const model = handler.getModel()

  test('`getOptions` should return replace any method with its name', () => {
    expect(options.inputs[0].querySearch).toBe('querySearch1')
    expect(options.inputs[0].handleSelect).toBe('handleSelect1')
    expect(options.inputs[1].querySearch).toBe('querySearch2')
    expect(options.inputs[1].handleSelect).toBe('handleSelect2')
  });

  test('`getModel` extracts input callbacks', () => {
    expect(model).toHaveProperty('querySearch1', querySearch1)
    expect(model).toHaveProperty('querySearch2', querySearch2)
    expect(model).toHaveProperty('handleSelect1', handleSelect1)
    expect(model).toHaveProperty('handleSelect2', handleSelect2)
  })
})

describe('MarkupHandler', () => {
  
  const options = {
    template: `<el-row>
                <el-button v-for="i in buttons" :type="i" @click="handleClick(i)">{{i}}</el-button>
              </el-row>`,
    data: {
      buttons: [
        'primary','success','info','warning','danger'
      ]
    },
    methods: {
      handleClick (val) {
        this.parent.displayMessage('You clicked on: ', val)
      }
    },

  }

  test('`getOptions` should return default options if not passed', () => {
    const handler = new MarkupHandler({})
    expect(handler.getOptions()).toHaveProperty('template', '<div></div>')
    expect(handler.getOptions()).toHaveProperty('methods', ['handleResponse', 'handleError'])
    expect(handler.getOptions()).toHaveProperty('data', {})
  });

  test('`getOptions` should wrap the template with a <div> tag', () => {
    const handler = new MarkupHandler(options)
    const template = handler.getOptions().template
    expect(template).toMatch('<div>' + options.template + '</div>')
  });

  test('`getOptions` replaces methods with their own names', () => {
    const handler = new MarkupHandler(options)
    expect(handler.getOptions().methods).toEqual(['handleClick', 'handleResponse', 'handleError'])
  });

  test('`getModel` returns the options methods', () => {
    const handler = new MarkupHandler(options)
    expect(handler.getModel()).toHaveProperty('handleClick', options.methods.handleClick)
  });
})

describe('AutoRunHandler', () => {
  const launcherCallback1 = () => {}
  const launcherCallback2 = () => {}
  const mockLauncher1 = {
    callback: launcherCallback1,
    trigger: 'pageLoad'
  }

  const mockLauncher2 = {
    callback: launcherCallback2,
    trigger: 'pageExit'
  }

  const handler = new AutoRunHandler({launchers: [mockLauncher1, mockLauncher2]})
  const options = handler.getOptions()

  test('`getOptions` should replace any method with its name', () => {
    expect(options.launchers[0].callback).toBe('launcherCallback1')
  });

  test('`getModel` extracts launcher callbacks and appends request handlers', () => {
    const model = handler.getModel()
    expect(model).toHaveProperty('launcherCallback1', launcherCallback1)
    expect(model).toHaveProperty('launcherCallback2', launcherCallback2)
    expect(model).toHaveProperty('handleResponse')
    expect(typeof model.handleResponse).toBe('function')
    expect(model).toHaveProperty('handleError')
    expect(typeof model.handleError).toBe('function')
  })
})