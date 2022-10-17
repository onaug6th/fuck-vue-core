/**
 * 储存副作用函数的桶
 * @type { TBucket }
 */
const bucket = new WeakMap()

/**
 * 实例数据
 */
const data = {
    showNameFirst: true,
    name: 'august',
    age: 25
}

/**
 * 对象进行响应式处理
 */
const _data = new Proxy(data, {
    get(target, key) {
        //  该对象的属性被读取时，进行依赖收集
        track(target, key)
        //  返回属性值
        return target[key]
    },
    set(target, key, newVal) {
        //  该对象的属性被修改时，设置属性值
        target[key] = newVal
        //  对象属性值发生变化，执行副作用函数
        trigger(target, key)
    }
})

/**
 * 对已劫持对象的某个属性进行依赖收集
 * @param { object } target 目标对象
 * @param { string } key 对象属性
 */
function track(target, key) {
    //  如没有正在运行中的effect，说明并不需要收集
    if (!activeEffect) {
        return
    }

    /**
     * 依赖Map
     * @type { TDepsMap }
     */
    let depsMap = bucket.get(target)
    if (!depsMap) {
        depsMap = new Map()
        bucket.set(target, depsMap)
    }

    /**
     * 副作用函数set
     * @type { TDeps }
     */
    let deps = depsMap.get(key)
    if (!deps) {
        deps = new Set()
        depsMap.set(key, deps)
    }

    //  属性的更新队列添加副作用函数
    deps.add(activeEffect)
    //  给副作用函数的deps数组推入deps，这样副作用函数每次执行的时候都能调用cleanup清空属性的依赖
    activeEffect.deps.push(deps)
}

/**
 * 执行某个属性的全部副作用函数
 * @param { object } target 目标对象
 * @param { string } key 对象属性
 */
function trigger(target, key) {
    //  如该对象没有依赖Map，说明未曾依赖收集过，直接返回
    const depsMap = bucket.get(target)
    if (!depsMap) {
        return
    }

    /**
     * 副作用函数set
     * @type { TDeps }
     */
    const deps = depsMap.get(key)

    if (!deps) {
        return
    }

    /**
     * 关键操作，必须使用一个新的Set
     * 因为后续effectFn依赖收集，会对同一个属性进行delete和add。会让原先set的forEach产生无限循环
     */
    const newSetArr = new Set(deps)

    newSetArr.forEach(effectFn => {
        //  存在调度任务
        if (effectFn.options.scheduler) {
            effectFn.options.scheduler(effectFn)
        }
        //  否则执行副作用函数
        else {
            effectFn()
        }
    })
}

/**
 * 当前激活的副作用函数
 * @type { TEffect }
 */
let activeEffect

/**
 * 副作用函数栈
 * 在嵌套effect函数时，为了保证track函数收集的effect为正确的
 * @type { Array<TEffect> }
 */
const effectStack = []

/**
 * 将业务函数注册为副作用函数
 * @param { Function } fn 业务函数
 * @param { TEffectOptions } options 副作用函数配置
 */
function effect(fn, options = {}) {
    /**
     * 副作用函数
     * @type { TEffect }
     * @returns 
     */
    const effectFn = () => {
        //  清空此副作用函数依赖的对象属性
        cleanup(effectFn)

        //  赋值给 activeEffect，为了在get里能被正确收集依赖
        activeEffect = effectFn
        // 在调用副作用函数之前将当前副作用函数压栈
        effectStack.push(effectFn)

        //  执行业务函数，触发响应式属性读取
        const res = fn()

        //  在当前副作用函数执行完毕后，将当前副作用函数弹出栈，并还原 activeEffect 为之前的值
        effectStack.pop()
        activeEffect = effectStack[effectStack.length - 1]

        return res
    }

    //  将 options 挂在到 effectFn 上
    effectFn.options = options
    //  请用鼠标触摸deps查看注释
    effectFn.deps = []
    //  如指定初次不执行，不执行副作用函数，否则执行副作用函数
    if (!options.lazy) {
        effectFn()
    }

    return effectFn
}

/**
 * 将副作用函数从关联的属性依赖中去掉
 * @param { TEffect } effectFn 副作用函数
 */
function cleanup(effectFn) {
    for (let i = 0; i < effectFn.deps.length; i++) {
        const deps = effectFn.deps[i]
        deps.delete(effectFn)
    }

    effectFn.deps.length = 0
}

/**
 * 计算属性
 * @param { Function } getter 内含响应式属性的表达式
 * @returns 
 */
function computed(getter) {
    let value
    //  是否需要计算
    let isNeedComputed = true

    //  声明一个对象，仅有只读属性value
    const obj = {
        get value() {
            //  在首次读取，或依赖发生变化时。isNeedComputed会被设置为true
            //  重新执行副作用函数，获取最新正确的返回值
            if (isNeedComputed) {
                value = effectFn()
                isNeedComputed = false
            }

            //  计算属性被获取时，需要重新依赖收集
            track(obj, 'value')
            //  返回计算属性结果
            return value
        }
    }

    /**
     * 注册副作用函数，但首次不会执行，而是返回一个副作用函数
     * 在计算属性.value 被访问时，才会判断执行副作用函数
     */
    const effectFn = effect(getter, {
        //  指定lazy属性，首次不执行
        lazy: true,
        //  指定任务调度函数，处理计算属性逻辑
        scheduler() {
            //  调度任务被执行，说明需要依赖的属性发生变化
            //  在首次不需要计算时，才去触发副作用函数的执行。可以避免一个计算属性里多个依赖同时变化，导致多次执行
            if (!isNeedComputed) {
                //  设置为需要计算
                isNeedComputed = true

                //  计算属性发生改变，需要执行全部副作用函数
                trigger(obj, 'value')
            }
        }
    })

    return obj
}

/**
 * 递归的对响应式数据的每个属性访问一遍，进行依赖收集
 * @param { Object } value 
 * @param { Set<string> } seen 
 * @returns 
 */
function traverse(value, seen = new Set()) {
    if (typeof value !== 'object' || value === null || seen.has(value)) {
        return
    }
    seen.add(value)
    for (const k in value) {
        traverse(value[k], seen)
    }

    return value
}

/**
 * 观察一个/包含响应式数据或响应式数据属性的变化
 * @param { Function | Object | Array<Object> } source 观察的目标
 * @param { (newValue, oldValue) => {} } cb 变化的回调
 * @param { Object } options 配置
 */
function watch(source, cb, options = {}) {
    let getter

    //  函数指定观察目标
    if (typeof source === 'function') {
        getter = source
    }
    else if (Array.isArray(source)) {
        getter = () => source.forEach(i => traverse(i))
    }
    //  响应式数据，遍历此数据的所有属性进行访问
    else {
        getter = () => traverse(source)
    }

    let oldValue, newValue

    /**
     * watch执行任务
     */
    const job = () => {
        newValue = effectFn()
        cb(oldValue, newValue)
        oldValue = newValue
    }

    const effectFn = effect(
        // 执行 getter
        () => getter(),
        {
            lazy: true,
            scheduler: () => {
                if (options.flush === 'post') {
                    const p = Promise.resolve()
                    p.then(job)
                } else {
                    job()
                }
            }
        }
    )
    
    //  马上执行watch回调
    if (options.immediate) {
        job()
    }
    //  不马上执行watch回调，但建立依赖关系，并获取旧值
    else {
        oldValue = effectFn()
    }
}
