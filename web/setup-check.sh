#!/bin/bash

echo "🚀 Solar Shine Web Admin Panel Setup Verification"
echo "================================================"

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "❌ .env file not found. Please create one:"
    echo "   cp .env.example .env"
    echo "   Then update it with your Appwrite credentials"
    exit 1
else
    echo "✅ .env file found"
fi

# Check if required environment variables are set
if grep -q "your-project-id" .env 2>/dev/null; then
    echo "⚠️  Please update your .env file with actual Appwrite credentials"
    echo "   Current .env contains placeholder values"
fi

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "❌ Dependencies not installed. Please run:"
    echo "   pnpm install"
    exit 1
else
    echo "✅ Dependencies installed"
fi

# Check if pnpm is available
if ! command -v pnpm &> /dev/null; then
    echo "⚠️  pnpm not found. Install it with:"
    echo "   npm install -g pnpm"
fi

echo ""
echo "📋 Setup Checklist:"
echo "1. ✅ Dependencies installed"
echo "2. ✅ Environment file created"
echo "3. 🔲 Appwrite project created"
echo "4. 🔲 Database and collections created"
echo "5. 🔲 Authentication enabled"
echo "6. 🔲 Environment variables updated"
echo ""
echo "📚 Next Steps:"
echo "1. Follow the CLI guide in CLI_SETUP.md (fastest method)"
echo "2. Use automated setup: pnpm setup-db (shows CLI commands)"
echo "3. Or manual setup in APPWRITE_SETUP.md"
echo "4. Run 'pnpm dev' to start development server"
echo "5. Go to http://localhost:8080/login to access admin"
echo ""
echo "🎯 Quick Commands:"
echo "   pnpm dev          # Start development server"
echo "   pnpm build        # Build for production"
echo "   pnpm preview      # Preview production build"
echo "   pnpm setup-db     # Show database setup commands"
echo "   pnpm push-collections # Push collections via CLI"
echo ""
echo "📚 Documentation:"
echo "   CLI_SETUP.md      # Appwrite CLI setup (recommended)"
echo "   QUICK_START.md    # 5-minute setup guide"
echo "   ADMIN_README.md   # Complete admin guide"
echo "   APPWRITE_SETUP.md # Detailed backend setup"
echo ""
echo "🎉 Ready to build your Solar Shine admin panel!"