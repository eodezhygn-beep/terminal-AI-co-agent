import fs from 'fs';
import path from 'path';

export async function analyzeProject(projectPath) {
  const packageJsonPath = path.join(
    projectPath,
    'package.json'
  );

  let packageJson = {};

  if (fs.existsSync(packageJsonPath)) {
    packageJson = JSON.parse(
      fs.readFileSync(
        packageJsonPath,
        'utf-8'
      )
    );
  }

  const dependencies = {
    ...(packageJson.dependencies || {}),
    ...(packageJson.devDependencies || {})
  };

  const structure = {
    src: fs.existsSync(
      path.join(projectPath, 'src')
    ),
    components: fs.existsSync(
      path.join(projectPath, 'components')
    ),
    features: fs.existsSync(
      path.join(projectPath, 'features')
    ),
    pages: fs.existsSync(
      path.join(projectPath, 'pages')
    ),
    app: fs.existsSync(
      path.join(projectPath, 'app')
    )
  };

  return {
    framework:
      dependencies.react
        ? 'react'
        : 'unknown',

    typescript:
      !!dependencies.typescript,

    tailwind:
      !!dependencies.tailwindcss,

    prisma:
      !!dependencies.prisma,

    backend: fs.existsSync(
      path.join(projectPath, 'backend')
    ),

    frontend: structure.src,

    structure,

    preferredFrontendPath:
      structure.src
        ? 'src'
        : '.',

    preferredBackendPath:
      fs.existsSync(
        path.join(projectPath, 'backend/src')
      )
        ? 'backend/src'
        : 'backend'
  };
}
