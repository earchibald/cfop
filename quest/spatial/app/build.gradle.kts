// Twistwright for Meta Quest: a Spatial SDK app. The Quest page (quest/index.html) is a panel in the
// room; the app draws the cube beside it in passthrough, hears through the headset's own speech
// service and reads the cube over the headset's Bluetooth. quest/spatial/build.sh stages the pages in
// build/site-assets/ and runs Gradle; use it, not Gradle alone.
plugins {
  alias(libs.plugins.android.application)
  alias(libs.plugins.jetbrains.kotlin.android)
}

android {
  namespace = "com.twistwright.quest"
  compileSdk = 34

  defaultConfig {
    // The id of the WebView app (quest/android/): this app installs over it, and the pages keep
    // their storage (the cw: keys at https://appassets.androidplatform.net/).
    applicationId = "com.twistwright.quest"
    minSdk = 34 // Horizon OS is Android 14
    targetSdk = 34
    // Raise versionName with any change a user can see, and versionCode with every build that goes
    // on a headset over an older one.
    versionCode = 2
    versionName = "0.2.0"
  }

  sourceSets["main"].apply {
    // BleBridge.java and Pages.java are the WebView app's; MainActivity is that app's activity.
    java.srcDir("../../android/src")
    java.exclude("**/MainActivity.java")
    assets.srcDir("build/site-assets")
  }

  buildTypes {
    release { isMinifyEnabled = false }
  }
  packaging { resources.excludes.add("META-INF/LICENSE") }
  compileOptions {
    sourceCompatibility = JavaVersion.VERSION_17
    targetCompatibility = JavaVersion.VERSION_17
  }
  kotlinOptions { jvmTarget = "17" }
}

dependencies {
  implementation(libs.meta.spatial.sdk.base)
  implementation(libs.meta.spatial.sdk.toolkit)
  implementation(libs.meta.spatial.sdk.vr)
  implementation(libs.meta.spatial.sdk.isdk)
}
