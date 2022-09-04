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
