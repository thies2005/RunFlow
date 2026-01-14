# Android Build Environment Setup

To resolve the `JAVA_HOME` error and allow the build to proceed, please follow these steps:

## 1. Install JDK 17
The project requires a Java Development Kit (JDK) to build. 
- Download and install **JDK 17** from a trusted source, such as:
    - [Adoptium (Temurin 17)](https://adoptium.net/temurin/releases/?version=17) - Recommended.
    - [Oracle JDK 17](https://www.oracle.com/java/technologies/downloads/#java17)

## 2. Set JAVA_HOME Environment Variable
1.  **Find the installation path** (e.g., `C:\Program Files\Eclipse Adoptium\jdk-17.x.x.x-hotspot`).
2.  Open **Start Menu**, search for "Edit the system environment variables" and open it.
3.  Click **Environment Variables...**.
4.  Under **System variables**, click **New...**.
5.  Variable name: `JAVA_HOME`
6.  Variable value: (Paste your JDK installation path here).
7.  Click **OK**.
8.  Find the `Path` variable in **System variables**, select it, and click **Edit...**.
9.  Click **New** and add `%JAVA_HOME%\bin`.
10. Click **OK** on all windows.

## 3. Verify
1.  Open a **NEW** terminal (Command Prompt or PowerShell).
2.  Run: `java -version` (should show version 17).
3.  Run: `echo %JAVA_HOME%` (should show your path).

## 4. Run Build
Once set up, I can run the build myself, or you can run:
```powershell
.\gradlew.bat assembleDebug
```
