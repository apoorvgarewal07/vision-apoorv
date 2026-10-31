"""VISION-PHM: Standalone Server Launcher."""

import os
import uvicorn

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    # 0.0.0.0 listens on all local and external interfaces
    host = os.environ.get("HOST", "0.0.0.0")
    
    print("=" * 65)
    print("  VISION-PHM ENGINE • DECISION-FIRST PROGNOSTICS")
    print("=" * 65)
    print(f"  • Local Dashboard:  http://localhost:{port}")
    print(f"  • Loopback IP:      http://127.0.0.1:{port}")
    print(f"  • Swagger Docs:     http://localhost:{port}/docs")
    print(f"  • ReDoc:            http://localhost:{port}/redoc")
    print(f"  • Replay Stream:    http://localhost:{port}/api/v1/stream/replay/FD001")
    print("=" * 65)
    print("Note: In Windows web browsers, use http://localhost:8000")
    print("(Browsers treat 0.0.0.0 as an invalid destination address)\n")

    uvicorn.run("server:app", host=host, port=port, reload=False, workers=1)
