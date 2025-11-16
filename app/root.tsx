import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "react-router";

export default function Root() {
  return (
    <html lang="ja">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
        <style>{`
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }

          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
          }

          .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 16px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            padding: 40px;
          }

          h1 {
            color: #333;
            margin-bottom: 10px;
            font-size: 2.5rem;
          }

          .subtitle {
            color: #666;
            margin-bottom: 30px;
            font-size: 1.1rem;
          }

          .form-container {
            background: #f8f9fa;
            padding: 30px;
            border-radius: 12px;
            margin-bottom: 40px;
          }

          .form-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-bottom: 20px;
          }

          .form-group {
            display: flex;
            flex-direction: column;
          }

          label {
            font-weight: 600;
            margin-bottom: 8px;
            color: #333;
            font-size: 0.9rem;
          }

          input {
            padding: 12px;
            border: 2px solid #e0e0e0;
            border-radius: 8px;
            font-size: 1rem;
            transition: border-color 0.3s;
          }

          input:focus {
            outline: none;
            border-color: #667eea;
          }

          button {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 14px 30px;
            border: none;
            border-radius: 8px;
            font-size: 1rem;
            font-weight: 600;
            cursor: pointer;
            transition: transform 0.2s, box-shadow 0.2s;
          }

          button:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 20px rgba(102, 126, 234, 0.4);
          }

          button:active {
            transform: translateY(0);
          }

          .users-list {
            display: grid;
            gap: 20px;
          }

          .user-card {
            background: #fff;
            border: 2px solid #e0e0e0;
            border-radius: 12px;
            padding: 25px;
            transition: all 0.3s;
          }

          .user-card:hover {
            border-color: #667eea;
            box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
          }

          .user-header {
            display: flex;
            justify-content: space-between;
            align-items: start;
            margin-bottom: 20px;
          }

          .user-name {
            font-size: 1.5rem;
            font-weight: 700;
            color: #333;
          }

          .delete-btn {
            background: #e74c3c;
            padding: 8px 16px;
            font-size: 0.9rem;
          }

          .delete-btn:hover {
            background: #c0392b;
            box-shadow: 0 4px 12px rgba(231, 76, 60, 0.4);
          }

          .data-comparison {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
          }

          .data-section {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
          }

          .data-section.encrypted {
            border-left: 4px solid #e74c3c;
          }

          .data-section.decrypted {
            border-left: 4px solid #2ecc71;
          }

          .section-title {
            font-weight: 700;
            margin-bottom: 15px;
            font-size: 1.1rem;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }

          .encrypted .section-title {
            color: #e74c3c;
          }

          .decrypted .section-title {
            color: #2ecc71;
          }

          .data-row {
            margin-bottom: 12px;
          }

          .data-label {
            font-weight: 600;
            color: #666;
            font-size: 0.85rem;
            margin-bottom: 4px;
          }

          .data-value {
            color: #333;
            font-family: 'Monaco', 'Menlo', 'Courier New', monospace;
            font-size: 0.9rem;
            word-break: break-all;
            background: white;
            padding: 8px;
            border-radius: 4px;
          }

          .loading {
            text-align: center;
            padding: 40px;
            font-size: 1.2rem;
            color: #666;
          }

          .error {
            background: #fee;
            border: 2px solid #fcc;
            color: #c00;
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 20px;
          }

          .warning-banner {
            background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%);
            color: white;
            padding: 20px;
            border-radius: 12px;
            margin-bottom: 30px;
            border-left: 6px solid #c0392b;
            box-shadow: 0 4px 12px rgba(238, 90, 36, 0.3);
          }

          .warning-banner strong {
            display: block;
            font-size: 1.3rem;
            margin-bottom: 10px;
          }

          .warning-banner p {
            margin: 0;
            font-size: 1rem;
            line-height: 1.6;
          }

          .encryption-key-display {
            background: #fff8e1;
            border: 2px solid #ffd54f;
            padding: 20px;
            border-radius: 12px;
            margin-bottom: 30px;
          }

          @media (max-width: 768px) {
            .data-comparison {
              grid-template-columns: 1fr;
            }
          }
        `}</style>
      </head>
      <body>
        <Outlet />
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}
