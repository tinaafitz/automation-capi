# Frontend Bundle Optimization Guide

This guide explains how to optimize the React frontend bundle size for production.

## Current Optimizations

### 1. Production Build Settings

**`.env.production`:**
```bash
GENERATE_SOURCEMAP=false      # Disable source maps (saves ~40% bundle size)
INLINE_RUNTIME_CHUNK=false    # Separate runtime chunk for better caching
```

### 2. Bundle Analysis

Analyze your bundle size:

```bash
npm run build:analyze
```

This will:
1. Create a production build
2. Open a visualization showing what's in your bundle
3. Help identify large dependencies

### 3. Code Splitting

Use React.lazy() for route-based code splitting:

```javascript
import React, { Suspense, lazy } from 'react';

// Instead of:
// import Dashboard from './pages/Dashboard';

// Use lazy loading:
const Dashboard = lazy(() => import('./pages/Dashboard'));

function App() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <Dashboard />
    </Suspense>
  );
}
```

### 4. Tree Shaking

Ensure imports use named exports:

```javascript
// Good - allows tree shaking
import { Button, Input } from '@heroicons/react';

// Bad - imports entire library
import * as Icons from '@heroicons/react';
```

## Optimization Checklist

### Quick Wins

- [ ] Enable production build optimizations (`.env.production`)
- [ ] Remove unused dependencies from `package.json`
- [ ] Use tree-shakeable imports
- [ ] Lazy load routes with React.lazy()
- [ ] Optimize images (use WebP, compress)

### Advanced Optimizations

- [ ] Implement code splitting for large components
- [ ] Use dynamic imports for heavy libraries
- [ ] Configure webpack bundle splitting
- [ ] Implement service worker for caching
- [ ] Use CDN for static assets

## Analyzing Bundle Size

### 1. Build and Analyze

```bash
npm run build:analyze
```

### 2. Check Build Output

After `npm run build`, check:

```
File sizes after gzip:

  45.2 KB  build/static/js/2.abc123.chunk.js
  2.1 KB   build/static/js/main.def456.chunk.js
  1.4 KB   build/static/js/runtime-main.ghi789.js
```

### 3. Size Targets

- **Main bundle**: < 200 KB (gzipped)
- **Vendor bundle**: < 300 KB (gzipped)
- **Total initial load**: < 500 KB (gzipped)

## Common Large Dependencies

### Identify Large Packages

```bash
npm run analyze
```

Look for:
- Moment.js → Replace with date-fns or day.js
- Lodash → Import specific functions only
- Large icon libraries → Use tree-shakeable alternatives

### Optimize Icons

```javascript
// Instead of importing all icons:
// import { IconName } from '@heroicons/react/24/solid';

// Import specific icons:
import HomeIcon from '@heroicons/react/24/solid/HomeIcon';
import UserIcon from '@heroicons/react/24/solid/UserIcon';
```

## Lazy Loading Strategies

### 1. Route-Based Splitting

```javascript
const Dashboard = lazy(() => import('./pages/Dashboard'));
const ClusterList = lazy(() => import('./pages/ClusterList'));
const Settings = lazy(() => import('./pages/Settings'));
```

### 2. Component-Based Splitting

```javascript
// Load heavy components only when needed
const ChartComponent = lazy(() => import('./components/Chart'));

function Analytics() {
  const [showChart, setShowChart] = useState(false);

  return (
    <div>
      <button onClick={() => setShowChart(true)}>Show Chart</button>
      {showChart && (
        <Suspense fallback={<Spinner />}>
          <ChartComponent />
        </Suspense>
      )}
    </div>
  );
}
```

### 3. Library Code Splitting

```javascript
// Load heavy libraries on demand
const handleExport = async () => {
  const XLSX = await import('xlsx');
  // Use XLSX library
};
```

## Production Build Checklist

Before deploying:

- [ ] Run `npm run build`
- [ ] Check bundle sizes in output
- [ ] Test production build locally: `serve -s build`
- [ ] Verify all routes load correctly
- [ ] Check Network tab in DevTools
- [ ] Lighthouse performance audit (target: >90)

## Monitoring

### Lighthouse CI

Add to CI/CD:

```yaml
- name: Run Lighthouse CI
  run: |
    npm install -g @lhci/cli
    lhci autorun
```

### Bundle Size Monitoring

Track bundle size over time:

```bash
# Add to CI
npm run build
ls -lh build/static/js/*.js
```

## Performance Budget

Set limits in `package.json`:

```json
{
  "bundlesize": [
    {
      "path": "./build/static/js/*.js",
      "maxSize": "200 KB"
    }
  ]
}
```

## Resources

- [Web.dev Performance](https://web.dev/fast/)
- [React Code Splitting](https://reactjs.org/docs/code-splitting.html)
- [Webpack Bundle Analyzer](https://github.com/webpack-contrib/webpack-bundle-analyzer)
- [Source Map Explorer](https://github.com/danvk/source-map-explorer)

## Troubleshooting

### Large Bundle After Optimization

1. Run bundle analysis: `npm run build:analyze`
2. Identify largest chunks
3. Consider lazy loading or replacing dependencies
4. Check for duplicate dependencies: `npm ls`

### Slow Build Times

1. Use production mode: `NODE_ENV=production npm run build`
2. Clear cache: `rm -rf node_modules/.cache`
3. Update dependencies: `npm update`

### Runtime Errors After Splitting

1. Check Suspense boundaries
2. Verify dynamic imports
3. Test all routes thoroughly
4. Check console for loading errors
