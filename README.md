## Redux-saga
- redux-saga是一个redux中间键,其通过副作用方法致力于使应用数据更容易管理，执行并且容易测试
- 在reducer中都是纯函数，但在实际开发中，我们需要设计异步请求以及不纯粹的操作（“副作用”），不像redux-thunk的侵入式，saga提供一个完整的方式，但也是结构变得复杂。
- 工作原理以Generator函数来yield Effects

### index.js
```
export default function createSagaMiddleware() {
    function createChannel() {
        let listener = {}
        function subscribe(actionType, cb) {
            listener[actionType]=cb;
        } 
        function publish(action) {
            if(listener[action.type]) {
                let temp = listener[action.type];
                delete listener[action.type];
                temp(action)
            }
        }
        return {subscribe, publish}
    }
    let channel = createChannel();
    function times(cb, total) {
        let count = 0;
        return function() {
            if(++count === total) {
                cb()
            }
        }
    }
    function sagaMiddleware({getState,dispatch}) {
        function run(generator) {
            let it= typeof generator === 'function' ? generator() : generator;
            function next(action) {
                let {value:effect,done}=it.next();
                if(!done){
                    if(typeof effect[Symbol.iterator] == 'function') {
                        run(effect);
                        next()
                    } else if(effect.then) {
                        effect.then(next)
                    } else {
                        switch(effect.type) {
                            case 'take':
                                channel.subscribe(effect.actionType,next);
                                break;
                            case 'put':
                                dispatch(effect.action);
                                next();
                                break;
                            case 'fork':
                                let newTask = effect.task()
                                run(newTask);
                                next(newTask);
                                break;
                            case 'call':
                                effect.fn(...effect.arg).then(next);
                                break;
                            case 'cps':
                                effect.fn(...effect.args, next);
                                break;
                            case 'all':
                                let fns=effect.fns;
                                let done=times(next, fns.length);
                                for (let i=0;i<fns.length;i++){
                                    let fn=fns[i];
                                    run(fn,done);
                                }
                                break;
                            case 'cancel':
                                effect.task.return('over');
                                break;
                            default:
                                break;
                        }
                    }
                }
            }
            next()
        }
        sagaMiddleware.run = run;
        return function(next) {
            return function(action) {
                channel.publish(action);
                next(action)
            }
        }
    } 
    return sagaMiddleware;
}
```
### effects.js
```
export function take(actionType) {
    return {
        type:'take',
        actionType
    }
}

export function put(action) {
    return {
        type: 'put',
        action
    }
}

export function fork(task) {
    return {
        type: 'fork',
        task
    }
}

export  function* takeEvery(actionType, task) {
    yield fork(function* () {
        while (true) {
            yield take(actionType);
            yield task();
        }
    })
}

export function call(fn, ...args) {
    return {
        type: 'call',
        fn, 
        args
    }
}

const innerDelay = ms => new Promise((resolve, reject) => {
    setTimeout(() => {
        resolve()
    }, ms)
})

export function delay(...args) {
    return call(innerDelay, ...args)
}

export function cps(fn, ...args) {
    return {
        type: 'cps',
        fn,
        args
    }
}

export function all(fns) {
    return {
        type: 'all',
        fns
    }
}
```