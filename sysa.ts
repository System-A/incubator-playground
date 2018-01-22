class Fact<MD extends HasModelValues = {}> {
  constructor(public componentId: string, public factFn: IModelActionFn<MD>, createsComponent: boolean) {
  }
}

class ModelValue<T> {
  hasValue: boolean
  value: T
  set(value: T) {

  }
}

interface IValueDetails {
  labels?: string[],
  notes?: string,
}

class MultiModelValue<T> extends ModelValue<T[]> {
  add(value: T, details: IValueDetails = {}) {

  }
}

type FactSetOrPromise<MD extends HasModelValues> = Promise<FactSet<MD>> | FactSet<MD>

class GatherContext<MD extends HasModelValues> {
  /**
   * Run the given fact-generating function once.
   * @param name Rule name.
   * @param fn Fact-generating function.
   */
  once(name: string, fn: (components: Model<MD>[]) => FactSetOrPromise<MD>) {

  }

  /**
   * Run the given fact-generating function once, when a model property value is
   * available for a component.
   * @param propertySelector Model property value selector.
   * @param ruleName Rule name.
   * @param componentRuleFn Fact-generating function. Receives the property value and component model as arguments.
   */
  onceFor<T>(propertySelector: (model: Model<MD>) => ModelValue<T>, ruleName: string, componentRuleFn: (propertyValue: T, model: Model<MD>) => FactSetOrPromise<MD>) {
    throw new Error()
  }

  /**
   * Run the given fact-generating function once, when a new value in a multi-value model property is
   * available for a component.
   * @param propertySelector Model property value selector.
   * @param ruleName Rule name.
   * @param componentRuleFn Fact-generating function. Receives the new property value and component model as arguments.
   */  
  onceForEvery<T>(propertySelector: (model: Model<MD>) => MultiModelValue<T>, ruleName: string, componentRuleFn: (propertyValue: T, model: Model<MD>) => FactSetOrPromise<MD>) {
    throw new Error()
  }

  facts(componentId: string, ...modelFns: IModelActionFn<MD>[]): Fact<MD>[] {
    return modelFns.map(f => new Fact<MD>(componentId, f, false))
  }

  factsCreateComponent(componentId: string, ...modelFns: IModelActionFn<MD>[]): Fact<MD>[] {
    return modelFns.map(f => new Fact<MD>(componentId, f, true))
  }
}

function gather<MD extends HasModelValues>(initial: () => MD, fn: (c: GatherContext<MD>) => void): any
function gather(fn: (c: GatherContext<{}>) => void): any
function gather<MD extends HasModelValues>(al: (() => MD) | ((c: GatherContext<MD>) => void), fn?: (c: GatherContext<MD>) => void): any
{
  
}

const initial = {
  readme: new ModelValue<string>(),
  gitLabProject: new ModelValue<IGitLabProject>(),
}

const initialModel = {
  deployment: new ModelValue<IDeploymentReference>(),
  team: new ModelValue<string>(),
  description: new ModelValue<string>(),
  links: new MultiModelValue<ILink>(),
  sourceCode: new ModelValue<ISourceCodeReference>(),
  system: new ModelValue<string>()
}

gather(() => initial, c => {

  c.once("GitLab", () => 
    gitLab.projectSearch(p => p.startsWith('phoenix'))
      .then(projects => projects.map(gp => c.factsCreateComponent(gp.path,
        m => m.gitLabProject.set(gp),
        m => m.sourceCode.set(gp.sourceCodeReference())
      )))
  )

  c.once("Marathon", () => 
    marathon.applicationSearch(p => p.startsWith("/phoenix/"))
      .then(components => components.map(a => c.factsCreateComponent(a.id,
        m => m.deployment.add(a.deployment())
      )))
  )

  c.onceFor(m => m.gitLabProject, "Basic info from GitLab", (gp, cmp) => c.facts(cmp.id,
    m => m.team.set(gp.path[0]),
    m => m.description.set(gp.description),
  ))

  c.onceFor(m => m.sourceCode, "README from source code", (sc, cmp) => 
    sc.getText("/README.md").then(contents => contents
      ? c.facts(cmp.id, m => m.readme.set(contents))
      : [])
  )

  c.onceFor(m => m.readme, "Grafana links from README.md", (md, cmp) =>
    c.facts(cmp.id, m => m.links.add({ title: "Grafana", value: "http://aa.txt" }))
  )
})

type FactSet<T extends HasModelValues> = Fact<T> | Fact<T>[] | Fact<T>[][]

interface ILink {
  value: string,
  title?: string,
  description?: string,
}

interface IComponentModel {
  id: string,
  team: ModelValue<string>,
  system: ModelValue<string>,
  description: ModelValue<string>,
  sourceCode: ModelValue<ISourceCodeReference>,
  deployment: MultiModelValue<IDeploymentReference>,
  logging: ModelValue<ILoggingReference>,
  links: MultiModelValue<ILink>,
}

interface HasModelValues {
  [key: string]: ModelValue<any>
}

type Model<MD extends HasModelValues> = Readonly<IComponentModel & MD>

interface ICIReference {
  id: string
}

interface ISourceCodeReference {
  id: string,
  type: string,
  url: string
  webLink: string
  getTree(): Promise<string[]>
  getText(tree: string, head?: string): Promise<string | undefined>
}

interface ILoggingReference {

}

interface IDeploymentReference {
  type: string,
  getInstances(): Promise<string[]>
}

interface IGitLabProject {
  namespace: string[],
  path: string,
  pathParts: string[],
  name: string,
  description: string,
  defaultBranch: string,
  tags: string[],
  sourceCodeReference(): ISourceCodeReference,
}

class GitLab {
  public projectSearch(predicate: (name: string) => boolean): Promise<IGitLabProject[]> {
    return Promise.resolve([])
  }
}

class Marathon {
  public applicationSearch(predicate: (id: string) => boolean): Promise<IMarathonApp[]> {
    return Promise.resolve([])
  }
}

interface IMarathonApp {
  id: string,
  idParts: string[],
  deployment(): IDeploymentReference,
}

const gitLab = new GitLab()
const marathon = new Marathon()

interface IModelActionFn<MD extends HasModelValues> {
  (model: Model<MD>): void
}

/**
/**
// get description based on a README.md match
  // only when source code is present and README.md is there
  // otherwise get from GitLab description
// get related repositories by searching through README.md
  // only when sc is present
// get links to Grafana based on a README.md match
// map to Graylog based on a README.md match
// map to Marathon by marathon.json, if it doesn't exist, then attempt a string match
  // this means - create app from Marathon based on

// Constrain resolution into a single context - all rules act only on components generated within that context - what will be exported, then?
// integrations - VCS, deployment,

// Rule generates facts, which state something about an app.

// A Fact referencing an app might mean it generates an app, but that is optional (false by default).
// When evaluating Rules, we can store which fact was generated by which rule (for introspection).

 TODO: model => gather model
 References need to also contain the actual object
 Better DSL.. gather to fluent
 builder should also accept a config map, which will be used to map references to config keys
   x wont work - we can have multiple references from a single client

 */

interface IReferenceBackLink {
   configurationKey: any,
   lookupData: object
}

type IReference<T> = T & IReferenceBackLink

interface B {
  r: IReference<ISourceCodeReference>
}
