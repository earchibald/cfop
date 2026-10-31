// Twistwright for Meta Quest, the Spatial SDK app (see app/src/main/java/.../QuestActivity.kt).
pluginManagement { repositories { mavenCentral(); google(); gradlePluginPortal() } }
dependencyResolutionManagement {
  repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
  repositories { mavenCentral(); google() }
}
rootProject.name = "TwistwrightQuest"
include(":app")
