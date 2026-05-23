import java.util.Properties
import java.io.FileInputStream

plugins {
    id("com.android.application")
    id("kotlin-android")
    // The Flutter Gradle Plugin must be applied after the Android and Kotlin Gradle plugins.
    id("dev.flutter.flutter-gradle-plugin")
}

android {
    namespace = "com.example.justmemo"
    compileSdk = flutter.compileSdkVersion
    ndkVersion = flutter.ndkVersion

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_11
        targetCompatibility = JavaVersion.VERSION_11
    }

    kotlinOptions {
        jvmTarget = JavaVersion.VERSION_11.toString()
    }

    defaultConfig {
        // TODO: Specify your own unique Application ID (https://developer.android.com/studio/build/application-id.html).
        applicationId = "com.donghyeonkim.justmemo"
        // You can update the following values to match your application needs.
        // For more information, see: https://flutter.dev/to/review-gradle-config.
        minSdk = flutter.minSdkVersion
        targetSdk = flutter.targetSdkVersion
        versionCode = flutter.versionCode
        versionName = flutter.versionName
    }

    // ⭐ 서명 설정 (Signing Configs) 추가
    signingConfigs {
        create("release") {
            // "java.util.Properties()"에서 "java.util"을 제거하고, import된 클래스 사용
            val keystoreProperties = Properties() 
            val keystoreFile = rootProject.file("key.properties")
            
            if (keystoreFile.exists()) {
                // "java.io.FileInputStream"에서 "java.io"를 제거하고, import된 클래스 사용
                keystoreProperties.load(FileInputStream(keystoreFile))
                
                // key.properties 파일에서 서명 정보 로드
                storeFile = file(keystoreProperties.getProperty("storeFile"))
                storePassword = keystoreProperties.getProperty("storePassword")
                keyAlias = keystoreProperties.getProperty("keyAlias")
                keyPassword = keystoreProperties.getProperty("keyPassword")
            } else {
                // key.properties 파일을 찾을 수 없을 때의 처리 (예: 경고 또는 에러 발생)
                // 현재는 릴리스 빌드 시 이 파일이 필수이므로, 에러를 발생시키는 것이 안전합니다.
                throw GradleException("Key.properties file not found at ${keystoreFile.absolutePath}. Cannot sign release build.")
            }
        }
    }
    
    buildTypes {
        release {
            // 이전에 정의한 "release" signingConfig 사용을 지정
            signingConfig = signingConfigs.getByName("release")
            // AAB/APK 크기 최적화를 위해 Minify 활성화 (선택 사항)
            // isMinifyEnabled = true 
            // proguardFiles(getDefaultProguardFile("proguard-android.txt"), "proguard-rules.pro")
        }
    }
}

flutter {
    source = "../.."
}