const { withProjectBuildGradle } = require('expo/config-plugins');

const MARKER = '// tya:admob-kotlin-metadata';

/**
 * Lets :react-native-google-mobile-ads read play-services-ads' Kotlin metadata.
 *
 * The build fails with "The binary version of its metadata is 2.3.0, expected
 * version is 2.1.0" — play-services-ads 25.4.0 is compiled by a newer Kotlin
 * than the compiler this module runs, and a Kotlin compiler refuses metadata
 * newer than itself.
 *
 * Raising kotlinVersion project-wide does not fix it, which is worth writing
 * down because it looks like it should: the build log confirms the root project
 * on Kotlin 2.3.0 while this one module still compiles at 2.1. It resolves its
 * own Kotlin Gradle plugin through invertase's build plugin rather than
 * inheriting the root's.
 *
 * -Xskip-metadata-version-check is Kotlin's own escape hatch for precisely this
 * error: read the newer metadata anyway. It is scoped to this single module, so
 * every other module in the build keeps the normal check.
 *
 * The alternative was forcing an older play-services-ads through a resolution
 * strategy. That trades a compiler flag for an ads SDK the library was not
 * written against, which is the worse risk.
 */
const SNIPPET = `
${MARKER}
subprojects { subproject ->
  if (subproject.name == 'react-native-google-mobile-ads') {
    subproject.tasks.matching { it.name ==~ /compile.*Kotlin/ }.configureEach {
      compilerOptions.freeCompilerArgs.add('-Xskip-metadata-version-check')
    }
  }
}
`;

module.exports = function withAdMobKotlinMetadata(config) {
  return withProjectBuildGradle(config, (gradleConfig) => {
    if (gradleConfig.modResults.language !== 'groovy') {
      throw new Error(
        'withAdMobKotlinMetadata expects a Groovy android/build.gradle, got ' +
          gradleConfig.modResults.language
      );
    }
    if (!gradleConfig.modResults.contents.includes(MARKER)) {
      gradleConfig.modResults.contents += SNIPPET;
    }
    return gradleConfig;
  });
};
