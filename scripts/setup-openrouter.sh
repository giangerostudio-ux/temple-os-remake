#!/bin/bash
# ╔═══════════════════════════════════════════════════════════════════════════╗
# ║  Word of God - OpenRouter Setup                                           ║
# ║  Quick setup for free cloud AI with web search                            ║
# ╚═══════════════════════════════════════════════════════════════════════════╝

echo ""
echo "  ✝ Word of God - OpenRouter Setup ✝"
echo "  ════════════════════════════════════"
echo ""
echo "  OpenRouter gives you FREE access to powerful AI models:"
echo "  • Mistral Devstral (best for coding)"
echo "  • DeepSeek Chimera (great reasoning)"
echo "  • Xiaomi MiMo (top SWE-bench)"
echo ""
echo "  Features:"
echo "  ✅ Free tier with generous limits"
echo "  ✅ Web search enabled"
echo "  ✅ 30B+ parameter models"
echo "  ✅ No local resources needed"
echo ""
echo "  Steps:"
echo "  1. Go to: https://openrouter.ai/keys"
echo "  2. Sign up (Google/GitHub/Email)"
echo "  3. Create a new API key"
echo "  4. Paste the key in Word of God setup"
echo ""
echo "  Free tier limits:"
echo "  • 20 requests/minute"
echo "  • 50-1000 requests/day (depends on account)"
echo ""
echo "  Opening browser..."

# Try to open browser
if command -v xdg-open &> /dev/null; then
    xdg-open "https://openrouter.ai/keys" 2>/dev/null
elif command -v open &> /dev/null; then
    open "https://openrouter.ai/keys"
else
    echo "  Please visit: https://openrouter.ai/keys"
fi

echo ""
echo "  'Ask, and it shall be given you.' - Matthew 7:7"
echo ""
