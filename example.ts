import { extract, TReferenceConfig, ModelValue } from './extraction'
import { GitLab } from './gitlab'

interface IMyConfig extends TReferenceConfig {
  gitLab: GitLab<IMyConfig>
}

// 1. evaluate all rules
// 2. for every newly set value (or for the whole multimodel, if a new value is added to it), call all onceFor
// 3. for all newly added values to multimodes, call all onceForEvery
// 4. repeat 2. and 3. until no more work is to be done
// TODO: how to detect cycles?

extract()
  .withConfiguration<IMyConfig>({
    gitLab: new GitLab("https://git.int.avast.com/v4/api", "key"),
  })
  .withAdditionalExtractionModelData(() => ({
    readme: new ModelValue<string>(),
    gitLabProject: new ModelValue<string>(),
  }))
  .rules(c => {
    c.once("GitLab", async () => {
      // const projects = await gitLab.projectSearch(p => p.startsWith('phoenix'))
      return projects.map(gp => c.createComponent(gp.path,
        m => m.gitLabProject.set(gp),
        m => m.sourceCode.set(gp.sourceCodeReference())
      ))
    })

    c.once("Marathon", async () => {
      const apps = await marathon.applicationSearch(p => p.startsWith("/phoenix/"))
      return apps.map(a => c.createComponent(a.id, m => m.deployment.add(a.deployment())))
    })

    c.for(m => m.gitLabProject, "Basic info from GitLab", (gp, cmp) => c.component(cmp.id,
      m => m.team.set(gp.path[0]),
      m => m.description.set(gp.description),
    ))

    c.for(m => m.sourceCode, "README from source code", (sc, cmp) =>
      sc.getText("/README.md").then(contents => contents
        ? c.component(cmp.id, m => m.readme.set(contents))
        : [])
    )

    c.for(m => m.readme, "Grafana links from README.md", (md, cmp) =>
      c.component(cmp.id, m => m.links.add({ title: "Grafana", value: "http://aa.txt" }))
    )
  })

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

 */
