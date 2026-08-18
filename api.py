"""
DesktopEngine - Backend API REST em Python (CRUD + Basic Auth)
Executa um servidor HTTP nativo com suporte a CORS, Autenticação Básica (Basic Auth)
e operações completas de CRUD para catálogo de produtos.

Uso:
    python api.py
    (O servidor iniciará em http://localhost:8080)

Credenciais Padrão (Basic Auth):
    Usuário: admin
    Senha:   admin123
"""

import sys
import json
import base64
import sqlite3
import os
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs

PORT = 8080
DB_FILE = os.path.join(os.path.dirname(__file__), "database.db")

AUTH_USER = "admin"
AUTH_PASS = "admin123"

def init_db():
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS products (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            category TEXT NOT NULL,
            price REAL NOT NULL,
            stock INTEGER NOT NULL,
            description TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    # Insere dados de exemplo se a tabela estiver vazia
    cursor.execute("SELECT COUNT(*) FROM products")
    if cursor.fetchone()[0] == 0:
        sample_data = [
            ("Notebook Dell XPS 15", "Eletrônicos", 8990.00, 14, "Intel i7, 32GB RAM, SSD 1TB NVMe"),
            ("Monitor UltraWide 34\" LG", "Monitores", 2850.50, 22, "Resolução WQHD 144Hz IPS"),
            ("Teclado Mecânico RGB Pro", "Periféricos", 480.00, 45, "Switches Hot-swappable Gateron Red"),
            ("Mouse Ergonômico Vertical", "Periféricos", 260.00, 30, "Sensor óptico 4000 DPI, Conexão Wireless"),
            ("Cadeira Ergonômica Mesh", "Mobiliário", 1450.00, 8, "Apoio lombar 3D e braços articulados"),
            ("Headset Gamer 7.1 Wireless", "Áudio", 690.00, 18, "Drivers de 50mm e microfone com cancelamento de ruído"),
            ("Webcam 4K Ultra HD Pro", "Acessórios", 520.00, 12, "Sensor Sony Starvis com autofoco rápido"),
            ("Hub USB-C 8 em 1 Alumínio", "Acessórios", 195.00, 60, "HDMI 4K, Gigabit Ethernet, Leitor SD, PD 100W")
        ]
        cursor.executemany("""
            INSERT INTO products (name, category, price, stock, description)
            VALUES (?, ?, ?, ?, ?)
        """, sample_data)
        conn.commit()
    conn.close()

class CRUDRequestHandler(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        # Log elegante no terminal
        print(f"[{self.log_date_time_string()}] {self.command} {self.path} -> {args[1]}")

    def _send_cors_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With")
        self.send_header("Access-Control-Max-Age", "86400")

    def _send_json_response(self, status_code, data):
        self.send_response(status_code)
        self._send_cors_headers()
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.end_headers()
        self.wfile.write(json.dumps(data, ensure_ascii=False).encode("utf-8"))

    def _check_basic_auth(self):
        auth_header = self.headers.get("Authorization")
        if not auth_header:
            return False
        
        try:
            auth_type, encoded_credentials = auth_header.split(" ", 1)
            if auth_type.lower() != "basic":
                return False
            
            decoded_bytes = base64.b64decode(encoded_credentials)
            decoded_str = decoded_bytes.decode("utf-8")
            username, password = decoded_str.split(":", 1)
            
            return username == AUTH_USER and password == AUTH_PASS
        except Exception:
            return False

    def do_OPTIONS(self):
        # Trata preflight request do CORS
        self.send_response(204)
        self._send_cors_headers()
        self.end_headers()

    def do_GET(self):
        parsed = urlparse(self.path)
        path = parsed.path
        query = parse_qs(parsed.query)

        # Healthcheck (sem auth)
        if path == "/api/health":
            self._send_json_response(200, {
                "status": "online",
                "message": "DesktopEngine Python Backend API ativo e operacional",
                "version": "1.0.0"
            })
            return

        # Validação de Login / Credenciais
        if path == "/api/auth/verify":
            if self._check_basic_auth():
                self._send_json_response(200, {
                    "authenticated": True,
                    "user": AUTH_USER,
                    "message": "Credenciais válidas."
                })
            else:
                self._send_json_response(401, {
                    "authenticated": False,
                    "error": "Usuário ou senha incorretos."
                })
            return

        # Para endpoints de CRUD, exige autenticação
        if not self._check_basic_auth():
            self._send_json_response(401, {"error": "Não autorizado. Forneça o cabeçalho Basic Auth válido."})
            return

        # GET /api/products
        if path == "/api/products":
            search = query.get("search", [""])[0].strip()
            category = query.get("category", [""])[0].strip()

            conn = sqlite3.connect(DB_FILE)
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()

            sql = "SELECT * FROM products WHERE 1=1"
            params = []

            if search:
                sql += " AND (name LIKE ? OR description LIKE ?)"
                params.extend([f"%{search}%", f"%{search}%"])
            if category and category != "all":
                sql += " AND category = ?"
                params.append(category)

            sql += " ORDER BY id DESC"
            cursor.execute(sql, params)
            rows = cursor.fetchall()
            products = [dict(row) for row in rows]
            conn.close()

            self._send_json_response(200, {"success": True, "total": len(products), "data": products})
            return

        # GET /api/products/<id>
        if path.startswith("/api/products/"):
            try:
                prod_id = int(path.split("/api/products/")[1])
                conn = sqlite3.connect(DB_FILE)
                conn.row_factory = sqlite3.Row
                cursor = conn.cursor()
                cursor.execute("SELECT * FROM products WHERE id = ?", (prod_id,))
                row = cursor.fetchone()
                conn.close()

                if row:
                    self._send_json_response(200, {"success": True, "data": dict(row)})
                else:
                    self._send_json_response(404, {"success": False, "error": "Produto não encontrado."})
            except ValueError:
                self._send_json_response(400, {"success": False, "error": "ID inválido."})
            return

        self._send_json_response(404, {"error": "Endpoint não encontrado."})

    def do_POST(self):
        parsed = urlparse(self.path)
        path = parsed.path

        # POST /api/auth/login
        if path == "/api/auth/login":
            content_length = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(content_length).decode("utf-8")
            try:
                payload = json.loads(body)
                u = payload.get("username")
                p = payload.get("password")
                if u == AUTH_USER and p == AUTH_PASS:
                    # Gera token Basic em base64 para o front salvar
                    token = base64.b64encode(f"{u}:{p}".encode("utf-8")).decode("utf-8")
                    self._send_json_response(200, {
                        "success": True,
                        "token": token,
                        "user": u,
                        "message": "Autenticação bem-sucedida!"
                    })
                else:
                    self._send_json_response(401, {
                        "success": False,
                        "error": "Usuário ou senha inválidos. Tente admin / admin123."
                    })
            except Exception as e:
                self._send_json_response(400, {"success": False, "error": f"JSON inválido: {str(e)}"})
            return

        # CRUD exige autenticação
        if not self._check_basic_auth():
            self._send_json_response(401, {"error": "Não autorizado."})
            return

        # POST /api/products
        if path == "/api/products":
            content_length = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(content_length).decode("utf-8")
            try:
                payload = json.loads(body)
                name = payload.get("name", "").strip()
                category = payload.get("category", "Geral").strip()
                price = float(payload.get("price", 0))
                stock = int(payload.get("stock", 0))
                description = payload.get("description", "").strip()

                if not name:
                    self._send_json_response(400, {"success": False, "error": "O campo 'name' é obrigatório."})
                    return

                conn = sqlite3.connect(DB_FILE)
                cursor = conn.cursor()
                cursor.execute("""
                    INSERT INTO products (name, category, price, stock, description)
                    VALUES (?, ?, ?, ?, ?)
                """, (name, category, price, stock, description))
                new_id = cursor.lastrowid
                conn.commit()
                conn.close()

                self._send_json_response(201, {
                    "success": True,
                    "message": "Produto cadastrado com sucesso!",
                    "data": {
                        "id": new_id,
                        "name": name,
                        "category": category,
                        "price": price,
                        "stock": stock,
                        "description": description
                    }
                })
            except Exception as e:
                self._send_json_response(400, {"success": False, "error": f"Erro no cadastro: {str(e)}"})
            return

        self._send_json_response(404, {"error": "Endpoint não encontrado."})

    def do_PUT(self):
        parsed = urlparse(self.path)
        path = parsed.path

        if not self._check_basic_auth():
            self._send_json_response(401, {"error": "Não autorizado."})
            return

        # PUT /api/products/<id>
        if path.startswith("/api/products/"):
            try:
                prod_id = int(path.split("/api/products/")[1])
                content_length = int(self.headers.get("Content-Length", 0))
                body = self.rfile.read(content_length).decode("utf-8")
                payload = json.loads(body)

                name = payload.get("name", "").strip()
                category = payload.get("category", "").strip()
                price = float(payload.get("price", 0))
                stock = int(payload.get("stock", 0))
                description = payload.get("description", "").strip()

                if not name:
                    self._send_json_response(400, {"success": False, "error": "Nome não pode ficar vazio."})
                    return

                conn = sqlite3.connect(DB_FILE)
                cursor = conn.cursor()
                cursor.execute("""
                    UPDATE products
                    SET name = ?, category = ?, price = ?, stock = ?, description = ?
                    WHERE id = ?
                """, (name, category, price, stock, description, prod_id))
                updated = cursor.rowcount
                conn.commit()
                conn.close()

                if updated > 0:
                    self._send_json_response(200, {
                        "success": True,
                        "message": "Produto atualizado com sucesso!",
                        "data": {
                            "id": prod_id,
                            "name": name,
                            "category": category,
                            "price": price,
                            "stock": stock,
                            "description": description
                        }
                    })
                else:
                    self._send_json_response(404, {"success": False, "error": "Produto não encontrado."})
            except Exception as e:
                self._send_json_response(400, {"success": False, "error": f"Erro na atualização: {str(e)}"})
            return

        self._send_json_response(404, {"error": "Endpoint não encontrado."})

    def do_DELETE(self):
        parsed = urlparse(self.path)
        path = parsed.path

        if not self._check_basic_auth():
            self._send_json_response(401, {"error": "Não autorizado."})
            return

        # DELETE /api/products/<id>
        if path.startswith("/api/products/"):
            try:
                prod_id = int(path.split("/api/products/")[1])
                conn = sqlite3.connect(DB_FILE)
                cursor = conn.cursor()
                cursor.execute("DELETE FROM products WHERE id = ?", (prod_id,))
                deleted = cursor.rowcount
                conn.commit()
                conn.close()

                if deleted > 0:
                    self._send_json_response(200, {"success": True, "message": f"Produto #{prod_id} excluído com sucesso."})
                else:
                    self._send_json_response(404, {"success": False, "error": "Produto não encontrado."})
            except ValueError:
                self._send_json_response(400, {"success": False, "error": "ID inválido."})
            return

        self._send_json_response(404, {"error": "Endpoint não encontrado."})

def run_server():
    init_db()
    server_address = ("", PORT)
    httpd = HTTPServer(server_address, CRUDRequestHandler)
    print("=" * 65)
    print(f"🚀 DesktopEngine Python Backend API rodando em http://localhost:{PORT}")
    print("=" * 65)
    print(f"🔑 Credenciais Basic Auth:")
    print(f"   Usuário: {AUTH_USER}")
    print(f"   Senha:   {AUTH_PASS}")
    print("📋 Rotas disponíveis:")
    print("   GET    /api/health")
    print("   POST   /api/auth/login")
    print("   GET    /api/products")
    print("   POST   /api/products")
    print("   PUT    /api/products/<id>")
    print("   DELETE /api/products/<id>")
    print("=" * 65)
    print("Pressione Ctrl+C para encerrar o servidor.\n")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n🛑 Servidor encerrado.")
        httpd.server_close()

if __name__ == "__main__":
    run_server()
