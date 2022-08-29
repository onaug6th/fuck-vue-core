/**
 * 副作用函数
 * @typedef TEffect
 * @property { Array<TEffects> } deps 一个数组，数组项是某个属性的副作用函数数组
 * @property { TEffectOptions } options 副作用函数配置
 */

/**
 * 副作用函数配置
 * @typedef TEffectOptions
 * @property { boolean } lazy 是否懒执行
 * @property { Function } scheduler 调度任务
 */

/**
 * 某个属性的副作用函数数组
 * @typedef { Set<TEffect> } TEffects
 */

/**
 * 对象属性依赖
 * @typedef { Map<string, TEffects> } TDepsMap
 */

/**
 * 桶
 * @typedef { WeakMap.<Object, TDepsMap> } TBucket
 */

/**
 * 桶，存放着每个对象的对象属性依赖
 * @type { TBucket }
 */
const bucket = new WeakMap()

/**
 * 被劫持的对象
 */
const data = {
    name: 'august',
    age: 25
}

/**
 * 劫持对象
 */
const proxyData = new Proxy(data, {
    get(target, key) {
        //  该对象的属性被读取时，进行依赖收集
        track(target, key)
        //  返回属性值
        return target[key]
    },
    set(target, key, newVal) {
        //  设置属性值
        target[key] = newVal
        //  对象属性值发生变化，视图更新
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

    //  依赖Map
    let depsMap = bucket.get(target)
    if (!depsMap) {
        depsMap = new Map()
        bucket.set(target, depsMap)
    }

    let effects = depsMap.get(key)
    if (!effects) {
        effects = new Set()
        depsMap.set(key, effects)
    }

    //  该对象的属性的更新队列添加副作用函数
    effects.add(activeEffect)
    //  副作用函数的deps添加effects，是为了在每次执行的时候都能清空属性的依赖
    activeEffect.deps.push(effects)
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

    //  获取该属性的副作用函数
    const effects = depsMap.get(key)

    if (!effects) {
        return
    }

    /**
     * 关键操作，必须使用一个新的Set
     * 因为后续effectFn依赖收集，会对同一个属性进行delete和add。会让原先set的forEach产生无限循环
     */
    const newSetArr = new Set(effects)

    newSetArr.forEach(effectFn => {
        //  避免反复自身调用
        if (effectFn !== activeEffect) {
            //  存在调度任务
            if (effectFn.options.scheduler) {
                effectFn.options.scheduler(effectFn)
            }
            //  否则执行副作用函数
            else {
                effectFn()
            }
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
function effectRegister(fn, options = {}) {
    /**
     * 副作用函数
     * @type { TEffect }
     * @returns 
     */
    const effectFn = () => {
        //  清空此副作用函数依赖的对象属性
        cleanup(effectFn)

        /**
         * 当注册副作用函数时，将副作用函数赋值给 activeEffect
         * 为了在执行业务函数
         */
        activeEffect = effectFn
        // 在调用副作用函数之前将当前副作用函数压栈
        effectStack.push(effectFn)

        //  执行业务函数
        const res = fn()

        //  在当前副作用函数执行完毕后，将当前副作用函数弹出栈，并还原 activeEffect 为之前的值
        effectStack.pop()
        activeEffect = effectStack[effectStack.length - 1]

        return res
    }

    //  将 options 挂在到 effectFn 上
    effectFn.options = options
    //  activeEffect.deps 用来存储所有与该副作用函数相关的依赖集合
    effectFn.deps = []
    //  如未指定初次不执行，执行副作用函数
    if (!options.lazy) {
        effectFn()
    }

    return effectFn
}

/**
 * 将副作用函数绑定的依赖关系去掉
 * @param { TEffect } effectFn 副作用函数
 */
function cleanup(effectFn) {
    for (let i = 0; i < effectFn.deps.length; i++) {
        const deps = effectFn.deps[i]
        deps.delete(effectFn)
    }

    effectFn.deps.length = 0
}

//  一个模拟的表达式 {{ name + age }}
effectRegister(() => {
    console.log(proxyData.name + proxyData.age)
})
