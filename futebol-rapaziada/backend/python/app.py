from flask import Flask, jsonify, request, Response
from flask_jwt_extended import JWTManager, create_access_token, verify_jwt_in_request, get_jwt_identity
from supabase import create_client
import bcrypt
import os
import pymysql
import uuid
from dotenv import load_dotenv
from functools import wraps

load_dotenv()

# ─── CONEXÃO ─────────────────────────────────────────────────────────────────────

def obter_conexao():
    return pymysql.connect(
        host=os.getenv("DB_HOST"),
        port=int(os.getenv("DB_PORT")),
        user=os.getenv("DB_USER"),
        password=os.getenv("DB_PASSWORD"),
        database=os.getenv("DB_NAME"),
        charset="utf8mb4",
        cursorclass=pymysql.cursors.DictCursor
    )

# ─── APP ─────────────────────────────────────────────────────────────────────────

app = Flask(__name__)
app.config["JWT_SECRET_KEY"] = os.getenv("JWT_SECRET_KEY")
jwt = JWTManager(app)

@app.route("/")
def home():
    return jsonify({"status": "API online"})

# ─── DECORATOR ADMIN ─────────────────────────────────────────────────────────────

def _check_admin():
    verify_jwt_in_request()
    user_id = get_jwt_identity()
    conn = obter_conexao()
    cursor = conn.cursor()
    cursor.execute("SELECT admin FROM cadastro WHERE id_usuarios = %s", (user_id,))
    user = cursor.fetchone()
    cursor.close()
    conn.close()
    if not user or not user.get("admin"):
        return False
    return True

def admin_required(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        if not _check_admin():
            return jsonify({"erro": "Acesso negado"}), 403
        return fn(*args, **kwargs)
    return wrapper

# ─── CORS ────────────────────────────────────────────────────────────────────────

def origem_permitida(origin):
    if not origin:
        return False
    allowed = [
        "http://localhost:5173",
        "http://192.168.3.247:5173",
        "http://192.168.2.105:5173",
        "https://futebol-rapaziada.vercel.app",
    ]
    if origin in allowed:
        return True
    if origin.endswith(".vercel.app"):
        return True
    return False

@app.after_request
def add_cors_headers(response):
    origin = request.headers.get("Origin")
    if origem_permitida(origin):
        response.headers["Access-Control-Allow-Origin"] = origin
    response.headers["Access-Control-Allow-Credentials"] = "true"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS, PATCH"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
    return response

@app.before_request
def handle_preflight():
    if request.method == "OPTIONS":
        origin = request.headers.get("Origin")
        res = Response()
        if origem_permitida(origin):
            res.headers["Access-Control-Allow-Origin"] = origin
        res.headers["Access-Control-Allow-Credentials"] = "true"
        res.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS, PATCH"
        res.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
        return res, 204

# ─── CADASTRO ────────────────────────────────────────────────────────────────────

@app.route('/cadastro', methods=['POST'])
def cadastro():
    dados = request.get_json()
    nome  = dados.get('nome')
    email = dados.get('email')
    senha = dados.get('senha')

    conn   = obter_conexao()
    cursor = conn.cursor()

    cursor.execute("SELECT id_usuarios FROM cadastro WHERE email = %s", (email,))
    if cursor.fetchone():
        cursor.close(); conn.close()
        return jsonify({'erro': 'Email já cadastrado'}), 409

    senha_hash = bcrypt.hashpw(senha.encode('utf-8'), bcrypt.gensalt())
    cursor.execute(
        "INSERT INTO cadastro (nome, email, senha) VALUES (%s, %s, %s)",
        (nome, email, senha_hash)
    )
    conn.commit()
    cursor.close(); conn.close()
    return jsonify({'mensagem': 'Usuário cadastrado com sucesso'}), 201

# ─── LOGIN ───────────────────────────────────────────────────────────────────────

@app.route("/login", methods=["POST"])
def login():
    dados  = request.get_json()
    conn   = obter_conexao()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM cadastro WHERE email = %s", (dados["email"],))
    usuario = cursor.fetchone()
    cursor.close(); conn.close()

    if not usuario:
        return jsonify({"erro": "Usuário não encontrado!"}), 404

    if not bcrypt.checkpw(dados["senha"].encode("utf-8"), usuario["senha"].encode("utf-8")):
        return jsonify({"erro": "Senha incorreta!"}), 401

    token = create_access_token(identity=str(usuario["id_usuarios"]))
    return jsonify({
        "token": token,
        "user": {
            "id":      usuario["id_usuarios"],
            "nome":    usuario["nome"],
            "email":   usuario["email"],
            "isAdmin": bool(usuario.get("admin")),
        }
    })

# ─── MEU PERFIL ──────────────────────────────────────────────────────────────────

@app.route('/me', methods=['GET'])
def get_me():
    verify_jwt_in_request()
    user_id = get_jwt_identity()

    conn   = obter_conexao()
    cursor = conn.cursor()

    cursor.execute("SELECT nome FROM cadastro WHERE id_usuarios = %s", (user_id,))
    usuario = cursor.fetchone()
    if not usuario:
        cursor.close(); conn.close()
        return jsonify({"erro": "Usuário não encontrado"}), 404

    cursor.execute("SELECT * FROM jogadores WHERE id_usuarios = %s LIMIT 1", (user_id,))
    jogador = cursor.fetchone()
    cursor.close(); conn.close()

    if not jogador:
        return jsonify({"erro": "Jogador não encontrado"}), 404

    return jsonify(jogador)

# ─── JOGADORES ───────────────────────────────────────────────────────────────────

@app.route('/jogadores', methods=['GET'])
def get_jogadores():
    conn   = obter_conexao()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM jogadores")
    dados = cursor.fetchall()
    cursor.close(); conn.close()
    return jsonify(dados)

@app.route('/jogadores', methods=['POST'])
def criar_jogador():
    verify_jwt_in_request()
    id_usuario = get_jwt_identity()

    dados   = request.get_json()
    id_time = dados.get("time") or None
    conn    = obter_conexao()
    cursor  = conn.cursor()
    cursor.execute(
        """INSERT INTO jogadores
            (nome, posicao, id_time, idade, perna_boa, overall, fotoUrl, defesas, gols, assistencias, jogos, cartoes, vitorias, empates, derrotas, desarmes, id_usuarios)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)""",
        (
            dados["nome"][:90],
            dados["posicao"],
            id_time,
            dados["idade"],
            dados["perna_boa"],
            dados.get("overall", 0),
            dados.get("fotoUrl", ""),
            dados.get("defesas", 0),
            dados.get("gols", 0),
            dados.get("assistencias", 0),
            dados.get("jogos", 0),
            dados.get("cartoes", 0),
            dados.get("vitorias", 0),
            dados.get("empates", 0),
            dados.get("derrotas", 0),
            dados.get("desarmes", 0),
            id_usuario,
        )
    )
    conn.commit()
    cursor.close()
    conn.close()
    return jsonify({"mensagem": "Jogador cadastrado!"}), 201

@app.route('/jogadores/<int:id>', methods=['GET'])
def get_jogador(id):
    conn   = obter_conexao()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM jogadores WHERE id_jogador = %s", (id,))
    jogador = cursor.fetchone()
    cursor.close(); conn.close()
    if not jogador:
        return jsonify({"erro": "Jogador não encontrado"}), 404
    return jsonify(jogador)

@app.route('/jogadores/<int:id>', methods=['PUT'])
def atualizar_jogador(id):
    dados  = request.get_json()
    conn   = obter_conexao()
    cursor = conn.cursor()
    cursor.execute(
        """UPDATE jogadores SET
            nome         = %s,
            posicao      = %s,
            idade        = %s,
            perna_boa    = %s,
            fotoUrl      = %s,
            gols         = %s,
            assistencias = %s,
            jogos        = %s,
            cartoes      = %s,
            vitorias     = %s,
            empates      = %s,
            derrotas     = %s,
            desarmes     = %s,
            defesas      = %s
        WHERE id_jogador = %s""",
        (
            dados.get("nome"),
            dados.get("posicao"),
            dados.get("idade"),
            dados.get("perna_boa"),
            dados.get("fotoUrl", ""),
            dados.get("gols", 0),
            dados.get("assistencias", 0),
            dados.get("jogos", 0),
            dados.get("cartoes", 0),
            dados.get("vitorias", 0),
            dados.get("empates", 0),
            dados.get("derrotas", 0),
            dados.get("desarmes", 0),
            dados.get("defesas", 0),
            id,
        )
    )
    conn.commit()
    cursor.close(); conn.close()
    return jsonify({"mensagem": "Jogador atualizado!"})

@app.route('/jogadores/<int:id>', methods=['DELETE'])
def deletar_jogador(id):
    conn   = obter_conexao()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM jogadores WHERE id_jogador = %s", (id,))
    conn.commit()
    cursor.close(); conn.close()
    return jsonify({"mensagem": "Jogador deletado!"})

@app.route('/jogadores/<int:id>/overall', methods=['GET'])
def get_overall_jogador(id):
    conn   = obter_conexao()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT id_jogador, nome, overall, pac, sho, pas, dri, def, phy FROM jogadores WHERE id_jogador = %s",
        (id,)
    )
    jogador = cursor.fetchone()
    cursor.close(); conn.close()
    if not jogador:
        return jsonify({"erro": "Jogador não encontrado"}), 404
    return jsonify(jogador)

@app.route('/jogadores/<int:id>/confirmar', methods=['PATCH'])
def confirmar_jogador(id):
    dados      = request.get_json()
    confirmado = 1 if dados.get("confirmado") else 0
    conn       = obter_conexao()
    cursor     = conn.cursor()
    cursor.execute("UPDATE jogadores SET confirmado = %s WHERE id_jogador = %s", (confirmado, id))
    conn.commit()
    cursor.close(); conn.close()
    return jsonify({"mensagem": "Presença atualizada!", "confirmado": confirmado})

@app.route('/jogadores/<int:id>/pagamento', methods=['PATCH'])
def toggle_pagamento(id):
    dados  = request.get_json()
    pagou  = 1 if dados.get("pagou") else 0
    conn   = obter_conexao()
    cursor = conn.cursor()
    try:
        cursor.execute("UPDATE jogadores SET pagou = %s WHERE id_jogador = %s", (pagou, id))
        conn.commit()
        return jsonify({"mensagem": "Status atualizado!", "pagou": pagou}), 200
    except Exception as e:
        return jsonify({"erro": str(e)}), 500
    finally:
        cursor.close(); conn.close()

# ─── CAMPEONATOS ─────────────────────────────────────────────────────────────────

@app.route('/campeonatos', methods=['GET'])
def get_campeonatos():
    conn   = obter_conexao()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM campeonatos")
    dados = cursor.fetchall()
    cursor.close(); conn.close()
    return jsonify(dados)

# ─── CLASSIFICAÇÃO ───────────────────────────────────────────────────────────────

@app.route('/classificacao', methods=['GET'])
def get_classificacao():
    conn   = obter_conexao()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM classificacao")
    dados = cursor.fetchall()
    cursor.close(); conn.close()
    return jsonify(dados)

# ─── FINANCEIRO ──────────────────────────────────────────────────────────────────

@app.route('/financeiro', methods=['GET'])
def get_financeiro():
    conn   = obter_conexao()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM financeiro")
    dados = cursor.fetchall()
    cursor.close(); conn.close()
    return jsonify(dados)

# ─── JOGOS ───────────────────────────────────────────────────────────────────────

@app.route('/jogos', methods=['GET'])
def get_jogos():
    conn   = obter_conexao()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM jogos")
    dados = cursor.fetchall()
    cursor.close(); conn.close()
    return jsonify(dados)

# ─── RANKING ─────────────────────────────────────────────────────────────────────

@app.route('/ranking', methods=['GET'])
def get_ranking():
    conn   = obter_conexao()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM ranking")
    dados = cursor.fetchall()
    cursor.close(); conn.close()
    return jsonify(dados)

# ─── RECORDES ────────────────────────────────────────────────────────────────────

@app.route('/recordes', methods=['GET'])
def get_recordes():
    conn   = obter_conexao()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM recordes")
    dados = cursor.fetchall()
    cursor.close(); conn.close()
    return jsonify(dados)

# ─── TIMES ───────────────────────────────────────────────────────────────────────

@app.route('/times', methods=['GET'])
def get_times():
    conn   = obter_conexao()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM times")
    dados = cursor.fetchall()
    cursor.close(); conn.close()
    return jsonify(dados)

# ─── TIMES DO JOGO ───────────────────────────────────────────────────────────────

@app.route('/times-jogo', methods=['GET'])
def get_times_jogo():
    conn   = obter_conexao()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM times_jogo ORDER BY id")
    times = cursor.fetchall()
    for time in times:
        cursor.execute("""
            SELECT e.id, e.posicao_campo, e.reserva,
                   j.id_jogador as jogador_id, j.nome, j.posicao, j.fotoUrl, j.overall
            FROM escalacao e
            LEFT JOIN jogadores j ON e.id_jogador = j.id_jogador
            WHERE e.id_time = %s
            ORDER BY e.reserva, e.posicao_campo
        """, (time["id"],))
        time["escalacao"] = cursor.fetchall()
    cursor.close(); conn.close()
    return jsonify(times)

@app.route('/times-jogo', methods=['POST'])
def criar_time_jogo():
    dados  = request.get_json()
    conn   = obter_conexao()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO times_jogo (nome, cor) VALUES (%s, %s)",
        (dados.get("nome", "Time"), dados.get("cor", "#00ff87"))
    )
    conn.commit()
    novo_id = cursor.lastrowid
    cursor.close(); conn.close()
    return jsonify({"mensagem": "Time criado!", "id": novo_id}), 201

@app.route('/times-jogo/<int:id>', methods=['DELETE'])
def deletar_time_jogo(id):
    conn   = obter_conexao()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM escalacao WHERE id_time = %s", (id,))
    cursor.execute("DELETE FROM times_jogo WHERE id = %s", (id,))
    conn.commit()
    cursor.close(); conn.close()
    return jsonify({"mensagem": "Time deletado!"})

# ─── ESCALAÇÃO ───────────────────────────────────────────────────────────────────

@app.route('/escalacao', methods=['POST'])
def salvar_escalacao():
    dados  = request.get_json()
    id_time = dados.get("id_time")
    slots  = dados.get("slots", [])
    conn   = obter_conexao()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM escalacao WHERE id_time = %s", (id_time,))
    for slot in slots:
        cursor.execute(
            "INSERT INTO escalacao (id_time, id_jogador, posicao_campo, reserva) VALUES (%s, %s, %s, %s)",
            (id_time, slot.get("id_jogador") or None, slot.get("posicao_campo"), 1 if slot.get("reserva") else 0)
        )
    conn.commit()
    cursor.close(); conn.close()
    return jsonify({"mensagem": "Escalação salva!"})

@app.route('/escalacao/<int:id_time>', methods=['DELETE'])
def limpar_escalacao(id_time):
    conn   = obter_conexao()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM escalacao WHERE id_time = %s", (id_time,))
    conn.commit()
    cursor.close(); conn.close()
    return jsonify({"mensagem": "Escalação limpa!"})

# ─── MÍDIAS ──────────────────────────────────────────────────────────────────────

@app.route('/midias', methods=['GET'])
def get_midias():
    tag      = request.args.get('tag')
    busca    = request.args.get('busca')
    ordem    = request.args.get('ordem', 'recente')
    pagina   = int(request.args.get('pagina', 1))
    por_pagina = 10
    offset   = (pagina - 1) * por_pagina

    conn   = obter_conexao()
    cursor = conn.cursor()

    where  = "WHERE 1=1"
    params = []

    if tag:
        where += " AND m.tag = %s"
        params.append(tag)
    if busca:
        where += " AND (m.titulo LIKE %s OR j.nome LIKE %s)"
        params.extend([f"%{busca}%", f"%{busca}%"])

    order_map = {
        "curtidas": "m.curtidas DESC",
        "views":    "m.visualizacoes DESC",
        "recente":  "m.criado_em DESC",
    }
    order_sql = order_map.get(ordem, "m.criado_em DESC")

    cursor.execute(f"""
        SELECT COUNT(*) as total FROM midias m
        JOIN jogadores j ON j.id_jogador = m.jogador_id
        {where}
    """, params)
    total = cursor.fetchone()["total"]

    cursor.execute(f"""
        SELECT m.*, j.nome as autor_nome, j.id_jogador as autor_id
        FROM midias m
        JOIN jogadores j ON j.id_jogador = m.jogador_id
        {where}
        ORDER BY {order_sql}
        LIMIT %s OFFSET %s
    """, params + [por_pagina, offset])
    videos = cursor.fetchall()
    cursor.close(); conn.close()

    for v in videos:
        v["autor"] = {"id": v.pop("autor_id"), "nome": v.pop("autor_nome")}

    return jsonify({"total": total, "pagina": pagina, "por_pagina": por_pagina, "videos": videos})

@app.route('/midias/<int:id>', methods=['GET'])
def get_midia(id):
    conn   = obter_conexao()
    cursor = conn.cursor()
    cursor.execute("UPDATE midias SET visualizacoes = visualizacoes + 1 WHERE id = %s", (id,))
    conn.commit()
    cursor.execute("""
        SELECT m.*, j.nome as autor_nome, j.id_jogador as autor_id
        FROM midias m
        JOIN jogadores j ON j.id_jogador = m.jogador_id
        WHERE m.id = %s
    """, (id,))
    video = cursor.fetchone()
    cursor.close(); conn.close()
    if not video:
        return jsonify({"erro": "Vídeo não encontrado"}), 404
    video["autor"] = {"id": video.pop("autor_id"), "nome": video.pop("autor_nome")}
    return jsonify(video)

@app.route('/midias/<int:id>/curtir', methods=['POST'])
def curtir_midia(id):
    verify_jwt_in_request()
    jogador_id = int(get_jwt_identity())

    conn   = obter_conexao()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT id FROM midia_curtidas WHERE midia_id = %s AND jogador_id = %s",
        (id, jogador_id)
    )
    if cursor.fetchone():
        cursor.execute("DELETE FROM midia_curtidas WHERE midia_id = %s AND jogador_id = %s", (id, jogador_id))
        cursor.execute("UPDATE midias SET curtidas = curtidas - 1 WHERE id = %s", (id,))
        curtido = False
    else:
        cursor.execute("INSERT INTO midia_curtidas (midia_id, jogador_id) VALUES (%s, %s)", (id, jogador_id))
        cursor.execute("UPDATE midias SET curtidas = curtidas + 1 WHERE id = %s", (id,))
        curtido = True
    conn.commit()
    cursor.execute("SELECT curtidas FROM midias WHERE id = %s", (id,))
    total = cursor.fetchone()["curtidas"]
    cursor.close(); conn.close()
    return jsonify({"curtido": curtido, "total_curtidas": total})

@app.route('/midias/<int:id>', methods=['DELETE'])
def deletar_midia(id):
    verify_jwt_in_request()
    jogador_id = int(get_jwt_identity())

    conn   = obter_conexao()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM midias WHERE id = %s", (id,))
    midia = cursor.fetchone()
    if not midia:
        cursor.close(); conn.close()
        return jsonify({"erro": "Vídeo não encontrado"}), 404
    if midia["jogador_id"] != jogador_id:
        cursor.close(); conn.close()
        return jsonify({"erro": "Sem permissão"}), 403
    cursor.execute("DELETE FROM midias WHERE id = %s", (id,))
    conn.commit()
    cursor.close(); conn.close()
    return jsonify({"mensagem": "Vídeo deletado!"})

@app.route('/midias', methods=['POST'])
def criar_midia():
    verify_jwt_in_request()
    id_usuario = int(get_jwt_identity())

    titulo    = request.form.get("titulo")
    descricao = request.form.get("descricao", "")
    tag       = request.form.get("tag")
    arquivo   = request.files.get("video")

    if not titulo or not tag or not arquivo:
        return jsonify({"erro": "titulo, tag e video são obrigatórios"}), 400

    conn   = obter_conexao()
    cursor = conn.cursor()

    cursor.execute("SELECT nome FROM cadastro WHERE id_usuarios = %s", (id_usuario,))
    usuario = cursor.fetchone()
    if not usuario:
        cursor.close(); conn.close()
        return jsonify({"erro": "Usuário não encontrado"}), 404

    cursor.execute("SELECT id_jogador FROM jogadores WHERE nome = %s LIMIT 1", (usuario["nome"],))
    jogador = cursor.fetchone()
    if not jogador:
        cursor.close(); conn.close()
        return jsonify({"erro": "Jogador não encontrado"}), 404

    jogador_id = jogador["id_jogador"]

    extensao     = arquivo.filename.rsplit('.', 1)[-1].lower()
    nome_arquivo = f"{uuid.uuid4()}.{extensao}"
    conteudo     = arquivo.read()

    supabase_client = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_KEY"))
    supabase_client.storage.from_("videos").upload(
        path=nome_arquivo,
        file=conteudo,
        file_options={"content-type": arquivo.mimetype}
    )
    video_url = f"{os.getenv('SUPABASE_URL')}/storage/v1/object/public/videos/{nome_arquivo}"

    cursor.execute(
        "INSERT INTO midias (titulo, descricao, tag, video_url, jogador_id) VALUES (%s, %s, %s, %s, %s)",
        (titulo, descricao, tag, video_url, jogador_id)
    )
    conn.commit()
    novo_id = cursor.lastrowid

    cursor.execute("""
        SELECT m.*, j.nome as autor_nome, j.id_jogador as autor_id
        FROM midias m
        JOIN jogadores j ON j.id_jogador = m.jogador_id
        WHERE m.id = %s
    """, (novo_id,))
    midia = cursor.fetchone()
    cursor.close(); conn.close()

    midia["autor"] = {"id": midia.pop("autor_id"), "nome": midia.pop("autor_nome")}
    return jsonify(midia), 201

# ─── ADMINzao ───────────────────────────────────────────────────────────────────────

@app.route('/admin/jogadores/<int:id>/overall', methods=['PATCH'])
@admin_required
def admin_atualizar_overall(id):
    dados  = request.get_json()
    conn   = obter_conexao()
    cursor = conn.cursor()
    cursor.execute(
        """UPDATE jogadores SET
            overall = %s, pac = %s, sho = %s, pas = %s,
            dri = %s, def = %s, phy = %s
        WHERE id_jogador = %s""",
        (dados.get("overall"), dados.get("pac"), dados.get("sho"), dados.get("pas"),
         dados.get("dri"), dados.get("def"), dados.get("phy"), id)
    )
    conn.commit()
    cursor.close(); conn.close()
    return jsonify({"mensagem": "Overall atualizado!"})

@app.route('/admin/jogadores/<int:id>/stats', methods=['PATCH'])
@admin_required
def admin_atualizar_stats(id):
    dados  = request.get_json()
    conn   = obter_conexao()
    cursor = conn.cursor()
    cursor.execute(
        """UPDATE jogadores SET
            gols              = COALESCE(gols, 0)              + %s,
            assistencias      = COALESCE(assistencias, 0)      + %s,
            jogos             = COALESCE(jogos, 0)             + %s,
            vitorias          = COALESCE(vitorias, 0)          + %s,
            empates           = COALESCE(empates, 0)           + %s,
            derrotas          = COALESCE(derrotas, 0)          + %s,
            desarmes          = COALESCE(desarmes, 0)          + %s,
            defesas           = COALESCE(defesas, 0)           + %s,
            cartoes           = COALESCE(cartoes, 0)           + %s,
            cartoes_vermelhos = COALESCE(cartoes_vermelhos, 0) + %s
        WHERE id_jogador = %s""",
        (
            dados.get("gols", 0), dados.get("assistencias", 0), dados.get("jogos", 0),
            dados.get("vitorias", 0), dados.get("empates", 0), dados.get("derrotas", 0),
            dados.get("desarmes", 0), dados.get("defesas", 0),
            dados.get("cartoes", 0), dados.get("cartoes_vermelhos", 0),
            id,
        )
    )
    conn.commit()
    cursor.close(); conn.close()
    return jsonify({"mensagem": "Estatísticas atualizadas!"})

@app.route('/admin/jogadores/<int:id>/pagamento', methods=['PATCH'])
@admin_required
def admin_confirmar_pagamento(id):
    dados  = request.get_json()
    pagou  = 1 if dados.get("pagou") else 0
    conn   = obter_conexao()
    cursor = conn.cursor()
    cursor.execute("UPDATE jogadores SET pagou = %s WHERE id_jogador = %s", (pagou, id))
    conn.commit()
    cursor.close(); conn.close()
    return jsonify({"mensagem": "Pagamento atualizado!", "pagou": pagou})

@app.route('/admin/usuarios', methods=['GET'])
@admin_required
def admin_get_usuarios():
    conn   = obter_conexao()
    cursor = conn.cursor()
    cursor.execute("SELECT id_usuarios, nome, email, admin FROM cadastro")
    resultado = cursor.fetchall()
    cursor.close(); conn.close()
    return jsonify(resultado)

# ─── MAIN ────────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)