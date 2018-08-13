export class Fact<MD extends HasModelValues, TConfig> {
  constructor(public componentId: string, public factFn: IModelActionFn<MD, TConfig>, createsComponent: boolean) {
  }
}

export class ModelValue<T> {
  hasValue: boolean
  value: T
  set(value: T) {

  }
}

export interface IValueDetails {
  labels?: string[],
  notes?: string,
}

export class MultiModelValue<T> extends ModelValue<T[]> {
  add(value: T, details: IValueDetails = {}) {

  }
}

class ModelValueObservedWrapper<T> extends ModelValue<T> {
  private inner: ModelValue<T>
  private observerFn: (v: T) => void

  constructor(inner: ModelValue<T>, observerFn: (v: T) => void) {
    super()
    this.inner = inner
    this.observerFn = observerFn
  }

  set(value: T) {
    super.set(value)
    this.observerFn(value)
  }
}

type FactSetOrPromise<MD extends HasModelValues, TConfig> = Promise<FactSet<MD, TConfig>> | FactSet<MD, TConfig>

interface OnceFn<MD extends HasModelValues, TConfig> {
  name: string,
  fn: (components: Model<MD, TConfig>[]) => FactSetOrPromise<MD, TConfig>
}

interface PropertyFn<T, MD extends HasModelValues, TConfig> {
  propertySelector: (model: Model<MD, TConfig>) => ModelValue<T>,
  ruleName: string,
  componentRuleFn: (propertyValue: T, model: Model<MD, TConfig>) => FactSetOrPromise<MD, TConfig>
}

interface MultiPropertyFn<T, MD extends HasModelValues, TConfig> {
  propertySelector: (model: Model<MD, TConfig>) => MultiModelValue<T>,
  ruleName: string,
  componentRuleFn: (propertyValue: T, model: Model<MD, TConfig>) => FactSetOrPromise<MD, TConfig>
}

class ExtractionContext<MD extends HasModelValues, TConfig extends TReferenceConfig> {
  private onceFns: OnceFn<MD, TConfig>[] = []
  private forFns: PropertyFn<any, MD, TConfig>[] = []
  private forEveryFn: MultiPropertyFn<any, MD, TConfig>[] = []

  refs: { [K in keyof TConfig]: TConfig[K] extends IReferenceFactory<infer TC, infer TReferenceSource>
    ? TReferenceSource
    : never }

  /**
   * Run the given fact-generating function once.
   * @param name Rule name.
   * @param fn Fact-generating function.
   */
  once(name: string, fn: (components: Model<MD, TConfig>[]) => FactSetOrPromise<MD, TConfig>) {
    this.onceFns.push({ name, fn })
  }

  /**
   * Run the given fact-generating function once, when a model property value is
   * updated for a component.
   * @param propertySelector Model property value selector.
   * @param ruleName Rule name.
   * @param componentRuleFn Fact-generating function. Receives the property value and component model as arguments.
   */
  for<T>(propertySelector: (model: Model<MD, TConfig>) => ModelValue<T>, ruleName: string, componentRuleFn: (propertyValue: T, model: Model<MD, TConfig>) => FactSetOrPromise<MD, TConfig>) {
    this.forFns.push({propertySelector, ruleName, componentRuleFn})
  }

  /**
   * Run the given fact-generating function once, when a new value in a multi-value model property is
   * available for a component.
   * @param propertySelector Model property value selector.
   * @param ruleName Rule name.
   * @param componentRuleFn Fact-generating function. Receives the new property value and component model as arguments.
   */
  forEvery<T>(propertySelector: (model: Model<MD, TConfig>) => MultiModelValue<T>, ruleName: string, componentRuleFn: (propertyValue: T, model: Model<MD, TConfig>) => FactSetOrPromise<MD, TConfig>) {
    this.forEveryFn.push({propertySelector, ruleName, componentRuleFn})
  }

  component(componentId: string, ...modelFns: IModelActionFn<MD, TConfig>[]): Fact<MD, TConfig>[] {
    return modelFns.map(f => new Fact<MD, TConfig>(componentId, f, false))
  }

  createComponent(componentId: string, ...modelFns: IModelActionFn<MD, TConfig>[]): Fact<MD, TConfig>[] {
    return modelFns.map(f => new Fact<MD, TConfig>(componentId, f, true))
  }
}

export type TReferenceConfig = {
  [key: string]: IReferenceFactory<any, any>
}

interface IComponentChange {

}

interface IExtractionRuntime {
  getComponents(): any[]
  runRules(rules: { name: string, component: string?, fn:  }[]): Promise<IComponentChange[]>
}

interface IExtraction {
  config: object?,
  customExtractionModelData: () => object,
  run(runtime: IExtractionRuntime): Promise<void>
}

interface IExtractionBuilder<MD extends HasModelValues = {}, TConfig extends TReferenceConfig = {}> {
  withAdditionalExtractionModelData<AMD extends HasModelValues>(fn: () => AMD): IExtractionBuilder<AMD & MD, TConfig>
  withConfiguration<TAdditionalConfig extends TReferenceConfig>(c: TAdditionalConfig): IExtractionBuilder<MD, TConfig & TAdditionalConfig>
  rules(fn: (ctx: ExtractionContext<MD, TConfig>) => void): IExtraction
}

export function extract(): IExtractionBuilder {
  return {} as IExtractionBuilder
}

class ExtractionBuilder<MD extends HasModelValues = {}, TConfig extends  TReferenceConfig = {}> implements IExtractionBuilder<MD, TConfig> {
  private additionalExtractionModelData: () => MD
  private config: TConfig

  constructor(additionalExtractionModelData: () => MD, config: TConfig) {
    this.additionalExtractionModelData = additionalExtractionModelData
    this.config = config
  }

  withAdditionalExtractionModelData<AMD extends HasModelValues>(fn: () => AMD): IExtractionBuilder<AMD & MD, TConfig> {
    const combinedFn = () => {
      return {
        ...this.additionalExtractionModelData() as object,
        ...fn() as object
      } as any as AMD & MD
    }
    return new ExtractionBuilder(combinedFn, this.config)
  }

  withConfiguration<TAdditionalConfig extends TReferenceConfig>(c: TAdditionalConfig): IExtractionBuilder<MD, TConfig & TAdditionalConfig> {
    const combinedConfig = {...this.config as object, c} as any as TConfig & TAdditionalConfig
    return new ExtractionBuilder(this.additionalExtractionModelData, combinedConfig)
  }

  rules(fn: (ctx: ExtractionContext<MD, TConfig>) => void): IExtraction {
    const context = new ExtractionContext<MD, TConfig>()
    fn(context)
  }
}

export interface IReferenceFactory<TConfig, TReferenceSource> {
  get<TKey extends keyof TConfig>(configKey: TKey, config: TConfig[TKey]): TReferenceSource
}

export interface TReference<TConfig> {
  configKey: keyof TConfig
  data: object
}

export interface ISourceCodeReference<TConfig> extends TReference<TConfig> {
  url: string
  webLink: string
  getTree(): Promise<string[]>
  getText(tree: string, head?: string): Promise<string | undefined>
  checkout(): Promise<string[]>
}

type FactSet<T extends HasModelValues, TConfig> = Fact<T, TConfig> | Fact<T, TConfig>[] | Fact<T, TConfig>[][]

interface ILink {
  value: string,
  title?: string,
  description?: string,
}

interface IExtractionComponentModel<TConfig> {
  id: string,
  type: ModelValue<string>,
  team: ModelValue<string>,
  system: ModelValue<string>,
  description: ModelValue<string>,
  sourceCode: ModelValue<ISourceCodeReference<TConfig>>,
  deployment: MultiModelValue<IDeploymentReference>,
  logging: MultiModelValue<ILoggingReference>,
  links: MultiModelValue<ILink>,
}

// interface IExtractionComponentModel {
//   readonly id: string,
//   team?: string,
//   deployment: IDeploymentReference[],
// }

// type T<M> = { [K in keyof M]-?:
//   K extends "id" ? string : (
//   M[K] extends ArrayLike<infer A> ? MultiModelValue<A> : (
//     M[K] extends infer A | undefined ? ModelValue<A> : never
//   ))
// }

// const p: T<IExtractionComponentModel> = {} as T<IExtractionComponentModel>
// p.deployment.add()


interface HasModelValues {
  [key: string]: ModelValue<any>
}

type Model<MD extends HasModelValues, TConfig> = Readonly<IExtractionComponentModel<TConfig> & MD>

interface ILoggingReference {

}

interface IDeploymentReference {
  type: string,
  getInstances(): Promise<string[]>,
}

interface IModelActionFn<MD extends HasModelValues, TConfig> {
  (model: Model<MD, TConfig>): void
}

