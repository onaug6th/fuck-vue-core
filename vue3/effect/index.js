/**
 * @typedef { Map<string, Set<Function>> } TDepsMap 依赖Map
 */

/**
 * @typedef { WeakMap.<object, TDepsMap> } TBucket 存储副作用函数的桶
 */


/**
 * @typedef TBtn 按钮类型
 * @property { string } key 按钮键名
 * @property { string } text 按钮文本
 * @property { string } className 按钮样式类名
 * @property { boolean } isLeft 是否优先展示于左侧隐藏菜单
 */

/**
 * 存储副作用函数的桶
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

    //  属性的更新函数Set
    let deps = depsMap.get(key)
    if (!deps) {
        deps = new Set()
        depsMap.set(key, deps)
    }

    //  对该对象的属性添加更新函数
    deps.add(activeEffect)
    //  对此更新函数添加更新函数Set
    activeEffect.deps.push(deps)
}

/**
 * 触发已劫持对象的某个属性拥有的全部更新函数
 * @param {*} target 
 * @param {*} key 
 */
function trigger(target, key) {
    //  如该对象没有依赖Map，说明未曾依赖收集过，直接返回
    const depsMap = bucket.get(target)
    if (!depsMap) {
        return
    }

    //  获取该属性的更新函数数组
    const effects = depsMap.get(key)

    if (effects) {
        effects.forEach(effectFn => {
            //  避免反复自身调用
            if (effectFn === activeEffect) {
                return
            }

            //  存在调度任务
            if (effectFn.options.scheduler) {
                effectFn.options.scheduler(effectFn)
            }
            //  否则执行更新函数
            else {
                effectFn()
            }
        })
    }
}

/**
 * 当前激活的 effect 函数
 * @type { Function }
 */
let activeEffect
/**
 * effect 栈
 * 在嵌套effect函数时，为了保证track函数收集的effect为正确的
 * @type { Array<Function> }
 */
const effectStack = []

/**
 * @typedef { { lazy: boolean, scheduler: Function } } TEffectOptions 存储副作用函数的桶
 */

/**
 * effect函数
 * @param { Function } fn 
 * @param { TEffectOptions } options 
 */
function effect(fn, options = {}) {
    const effectFn = () => {
        //  清空此副作用函数依赖的对象属性
        cleanup(effectFn)

        //  当调用 effect 注册副作用函数时，将副作用函数赋值给 activeEffect
        activeEffect = effectFn
        // 在调用副作用函数之前将当前副作用函数压栈
        effectStack.push(effectFn)

        //  执行目标函数
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
 * 将effectFn绑定的依赖属性去掉
 * @param { Function } effectFn 
 */
function cleanup(effectFn) {
    for (let i = 0; i < effectFn.deps.length; i++) {
        const deps = effectFn.deps[i]
        deps.delete(effectFn)
    }
    effectFn.deps.length = 0
}

//  一个模拟的表达式 {{ name + age }}
effect(() => {
    console.log(proxyData.name + proxyData.age)
})
