/**
 * 副作用函数
 * @typedef TEffect
 * @property { Array<TDeps> } deps
 * 一个数组，数组项是某个属性的副作用函数数组
 * 
 * 在副作用函数执行时，副作用函数内的响应式属性被读取。会触发track依赖收集
 * 
 * 进行依赖收集时，会将该属性的副作用函数set存入deps
 * 
 * 此值的存在意义是，为了保证响应式属性变化时。每次收集和触发的副作用函数都是最新的，具体工作原理如下：
 * 
 * 在副作用函数执行时，都会执行cleanup方法。循环deps数组，将属性的副作用函数set把正在激活的副作用函数删掉。
 * 
 * 原因是副作用函数里可能存在分支条件，分支条件不满足时。某些属性的变化我们就不需要关心了，避免执行无用的逻辑。
 * 
 * 所以每次副作用函数执行时，都会经历cleanup——依赖收集，这样的过程
 * 
 * 保证响应式属性变化时，响应式属性都能收集到最新的依赖
 * 
 * @property { TEffectOptions } options 副作用函数的配置
 */

/**
 * 副作用函数配置
 * @typedef TEffectOptions
 * @property { boolean } lazy 是否懒执行
 * @property { Function } scheduler 调度任务
 */

/**
 * 存储副作用函数的set
 * 
 * 结构：Set<副作用函数>
 * @typedef { Set<TEffect> } TDeps
 */

/**
 * 依赖map
 * 
 * 存储每个对象属性的依赖
 * 
 * 结构：属性-副作用函数
 * @typedef { Map<string, TDeps> } TDepsMap
 */

/**
 * 储存副作用函数的桶
 * 
 * 存储响应式对象的依赖map
 * 
 * 结构：响应式对象——依赖map
 * @typedef { WeakMap.<Object, TDepsMap> } TBucket
 */
