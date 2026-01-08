# RunFlow Beta v1.0 🏃‍♂️💨

Welcome to the first beta release of **RunFlow**!

As a solo developer, I've spent countless hours building a platform that doesn't just track your runs, but helps you *understand* them. RunFlow is designed for runners who want precision, deep analytics, and structured training without the clutter of traditional apps.

## What's New in this Beta?

### 📊 Deep Performance Analytics
- **Physiological Models:** Native implementation of **TRIMP**, **CTL/ATL/TSB** (Training Stress Balance), and **Effective VO2max**.
- **Visual Trends:** 7-day rolling volume charts and training time analysis to help you avoid overtraining.
- **Enhanced Pace Charts:** High-precision charts with 2-minute interval ticks for better readability.
- **Marathon Shape:** New server-side calculations for a consistent "Marathon Readiness" metric across all screens.

### 📅 Intelligent Training Plans
- **Dynamic Generation:** Create training plans that adapt to your schedule.
- **Varied Workouts:** Updated logic ensures your training stays fresh—no more repetitive identical sessions.
- **Activity Binding:** Seamlessly link your completed Strava activities to your planned workouts to track adherence and compare "Planned vs. Actual."

### ⚡ Seamless Integration
- **Real-time Strava Sync:** Immediate updates via webhooks—your run is in RunFlow the moment you save it.
- **Global Activity Renaming:** Effortlessly rename activities across the entire dashboard.

### 🛡️ Production-Grade Stability
- **Enterprise Security:** Implemented rate limiting and robust error boundaries for a reliable experience.
- **Dockerized Deployment:** Simple, one-command setup for any VPS or local server with `amd64` and `arm64` support.
- **Automated Backups:** Your data is safe with automatic database backups every 6 hours.

## Known Issues & Roadmap
- This is a Beta release! You might encounter small bugs. Please report any issues on [GitHub](https://github.com/thies2005/RunFlow).
- More advanced race predictors.
- Expanded mobile-friendly UI enhancements.

## A Note from the Developer
Building RunFlow has been a passion project. I wanted something that combined technical depth with a modern, sleek interface. Thank you for being part of this first milestone.

Happy Running! 👟
