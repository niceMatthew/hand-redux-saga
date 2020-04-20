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