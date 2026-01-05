# Documentation Assets

This directory contains documentation assets and guides for the CAPI Automation project.

## 📁 Directory Structure

```
docs/
├── README.md                           # This file
├── ARCHITECTURE.md                     # Technical architecture diagram and documentation
├── SCREENSHOT_GUIDE.md                 # Guide for capturing UI screenshots
└── images/                             # Image assets
    └── screenshots/                    # UI screenshots for documentation
        ├── mce-environment.png
        ├── yaml-editor.png
        ├── ai-assistant.png
        └── test-dashboard.png
```

## 📸 UI Screenshots

Screenshots for the OVERVIEW.md documentation are stored in `images/screenshots/`.

### Required Screenshots (4 total)

1. **mce-environment.png** - MCE dashboard with 3-card layout
2. **yaml-editor.png** - YAML editor modal open
3. **ai-assistant.png** - AI assistant chat window
4. **test-dashboard.png** - Test Suite Dashboard

See [SCREENSHOT_GUIDE.md](SCREENSHOT_GUIDE.md) for detailed capture instructions.

### Quick Capture

```bash
# 1. Start the UI
cd ../ui && docker-compose up

# 2. Open browser
open http://localhost:3000

# 3. Follow SCREENSHOT_GUIDE.md to capture each screenshot

# 4. Save to docs/images/screenshots/
```

## 🔗 Using Images in Documentation

### In Markdown

```markdown
![MCE Environment](docs/images/screenshots/mce-environment.png)
![AI Assistant](docs/images/screenshots/ai-assistant.png)
```

## 📋 Checklist for Documentation

Before publishing or sharing the repository:

### Screenshots
- [ ] Capture MCE environment screenshot
- [ ] Capture YAML editor screenshot
- [ ] Capture AI assistant screenshot
- [ ] Capture test dashboard screenshot
- [ ] Verify all images load in OVERVIEW.md
- [ ] Commit all screenshots to `docs/images/screenshots/`

### Documentation
- [ ] Review OVERVIEW.md for broken links
- [ ] Verify all badges are showing correctly
- [ ] Test navigation links
- [ ] Proofread all content
- [ ] Test "Getting Started" instructions

## 🛠 Tools & Resources

### Image Creation
- **Canva**: https://www.canva.com (Online design tool)
- **Figma**: https://www.figma.com (Professional design)
- **Photopea**: https://www.photopea.com (Free Photoshop alternative)

### Screenshot Tools
- **macOS**: Cmd+Shift+4 (native)
- **Windows**: Win+Shift+S (Snipping Tool)
- **Linux**: Spectacle, Flameshot
- **Chrome DevTools**: Full page screenshots

### Image Optimization
- **TinyPNG**: https://tinypng.com (Compress PNG files)
- **Squoosh**: https://squoosh.app (Google's image optimizer)
- **ImageOptim**: https://imageoptim.com (macOS app)

## 📝 Updating Documentation

### Adding New Screenshots

1. Capture screenshot at appropriate resolution
2. Optimize image size (aim for < 500KB per screenshot)
3. Save to `docs/images/screenshots/` with descriptive name
4. Update OVERVIEW.md or README.md to reference the image
5. Commit both image and documentation update

## 🐛 Troubleshooting

### Screenshots not loading in documentation
- Verify file path is correct relative to OVERVIEW.md
- Check file extension is lowercase (.png, not .PNG)
- Ensure files are committed to git
- Test locally by viewing OVERVIEW.md in GitHub Desktop or VS Code

## 📞 Need Help?

If you encounter issues with documentation assets:

1. Check this README for solutions
2. Review the SCREENSHOT_GUIDE.md
3. Open an issue on GitHub
4. Ask in the project's communication channel

---

**Last Updated**: 2026-01-05
**Maintained By**: CAPI Automation Team
