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