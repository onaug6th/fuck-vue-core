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
}

/**
 * 执行某个属性的全部副作用函数
 * @param { object } target 目标对象
 * @param { string } key 对象属性
 */
function trigger(target, key) {
    //  如该对象没有副作用函数Map，说明未曾依赖收集过，直接返回
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

    deps.forEach(effectFn => {
        effectFn()
    })
}

/**
 * 当前激活的副作用函数
 * @type { TEffect }
 */
let activeEffect

/**
 * 将业务函数注册为副作用函数
 * @param { Function } fn 业务函数
 */
function effect(fn) {
    /**
     * 当注册副作用函数时，将副作用函数赋值给 activeEffect
     */
    activeEffect = fn

    //  执行业务函数，触发响应式属性读取
    fn()

    //  还原activeEffect
    activeEffect = undefined
}
