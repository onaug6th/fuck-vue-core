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
        effectFn()
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
 */
function effect(fn) {
    /**
     * 副作用函数
     * @type { TEffect }
     * @returns 
     */
    const effectFn = () => {
        //  将副作用函数从被收集的依赖列表中进行移除
        cleanup(effectFn)

        /**
         * 当注册副作用函数时，将副作用函数赋值给 activeEffect
         */
        activeEffect = effectFn
        // 在调用副作用函数之前将当前副作用函数压栈
        effectStack.push(effectFn)

        //  执行业务函数，触发响应式属性读取
        fn()

        //  在当前副作用函数执行完毕后，将当前副作用函数弹出栈，并还原 activeEffect 为之前的值
        effectStack.pop()
        activeEffect = effectStack[effectStack.length - 1]
    }

    //  请用鼠标触摸deps查看注释
    effectFn.deps = []

    effectFn()
}

/**
 * 将副作用函数从被收集的依赖列表中进行移除
 * @param { TEffect } effectFn 副作用函数
 */
function cleanup(effectFn) {
    for (let i = 0; i < effectFn.deps.length; i++) {
        const deps = effectFn.deps[i]
        deps.delete(effectFn)
    }

    effectFn.deps.length = 0
}
