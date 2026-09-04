# Bossclips App Store Launch Checklist

## Required before submitting
- [ ] Apple Developer membership active
- [ ] Unique iOS bundle ID set in app.json
- [ ] App created in App Store Connect
- [ ] ascAppId inserted in eas.json
- [ ] All demo clips replaced with owned/licensed content
- [ ] Privacy policy customized and hosted at public HTTPS URL
- [ ] Terms of use customized and hosted
- [ ] In-app Privacy/Terms button opens real URLs
- [ ] If accounts exist: in-app account deletion implemented
- [ ] If uploads/comments exist: report, block, moderation, abuse contact implemented
- [ ] App privacy questionnaire matches actual SDK/data collection
- [ ] Age rating completed accurately
- [ ] Support URL and contact information live
- [ ] App icon/splash verified on physical device
- [ ] Screenshots prepared for required iPhone sizes
- [ ] TestFlight test completed on physical devices
- [ ] Coin logic moved server-side before rewarding valuable/scarce perks
- [ ] No language implies Boss Coins are real money, earnings, investment, or withdrawable cash

## EAS commands
```bash
npm install
npm install -g eas-cli
eas login
eas build --platform ios --profile production
eas submit --platform ios
```
