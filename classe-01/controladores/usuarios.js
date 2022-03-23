const conexao = require('../conexao');
const securePassword = require('secure-password');
const jwt = require('jsonwebtoken');
const jwtSecret = require("../jwt_secret");

const pwd = securePassword();


const listarUsuarios = async (req, res) => {
    try {
        const { rows: usuarios } = await conexao.query('select * from usuarios');

        for (const usuario of usuarios) {
            const { rows: emprestimos } = await conexao.query('select * from emprestimos where usuario_id = $1', [usuario.id]);

            for (const emprestimo of emprestimos) {
                const { rows: livro } = await conexao.query('select nome from livros where id = $1', [emprestimo.livro_id]);
                emprestimo.livro = livro[0].nome;
            }

            usuario.emprestimos = emprestimos;
        }

        return res.status(200).json(usuarios);
    } catch (error) {
        return res.status(400).json(error.message);
    }
}

const obterUsuario = async (req, res) => {
    const { id } = req.params;
    try {
        let usuario = await conexao.query('select * from usuarios where id = $1', [id]);

        if (usuario.rowCount === 0) {
            return res.status(404).json('usuario não encontrado');
        }

        const { rows: emprestimos } = await conexao.query('select * from emprestimos where usuario_id = $1', [usuario.id]);

        for (const emprestimo of emprestimos) {
            const { rows: livro } = await conexao.query('select nome from livros where id = $1', [emprestimo.livro_id]);
            emprestimo.livro = livro[0].nome;
        }

        usuario = usuario.rows[0];
        usuario.emprestimos = emprestimos;
        return res.status(200).json(usuario);
    } catch (error) {
        return res.status(400).json(error.message);
    }
}

const cadastrarUsuario = async (req, res) => {
    const { nome, idade, email, telefone, cpf , senha } = req.body;

    if (!nome) {
        return res.status(400).json("O campo nome é obrigatório.");
    }

    if (!email) {
        return res.status(400).json("O campo email é obrigatório.");
    }

    if (!cpf) {
        return res.status(400).json("O campo cpf é obrigatório.");
    }

    if (!senha) {
        return res.status(400).json("O campo senha é obrigatório.");
    }

    try {
        const query = 'select * from usuarios where email = $1';
        const usuario = await conexao.query(query,[email]);

        if(usuario.rowCount > 0) {
            return res.status(200).json('Este e-mail já foi cadastrado.')
        }

        
    } catch (error) {
        return res.status(400).json(error.message);
    }

    try {
        const query = 'select * from usuarios where cpf = $1';
        const usuario = await conexao.query(query,[cpf]);

        if(usuario.rowCount > 0) {
            return res.status(200).json('Este cpf já foi cadastrado.')
        }

        
    } catch (error) {
        return res.status(400).json(error.message);
    }

    try {
        const hash = (await pwd.hash(Buffer.from(senha))).toString('hex');
        const query = 'insert into usuarios (nome, idade, telefone, cpf, senha, email) values ($1, $2, $3, $4 ,$5 ,$6)';
        const usuario = await conexao.query(query, [nome, idade, telefone, cpf, hash, email]);

        if (usuario.rowCount === 0) {
            return res.status(400).json('Não foi possivel cadastrar o usuario');
        }

        return res.status(200).json('usuario cadastrado com sucesso.')
    } catch (error) {
        return res.status(400).json(error.message);
    }
}

const atualizarUsuario = async (req, res) => {
    const { id } = req.params;
    const { nome, idade, email, telefone, cpf } = req.body;

    try {
        const usuario = await conexao.query('select * from usuarios where id = $1', [id]);

        if (usuario.rowCount === 0) {
            return res.status(404).json('usuario não encontrado');
        }

        if (!nome) {
            return res.status(400).json("O campo nome é obrigatório.");
        }

        if (!email) {
            return res.status(400).json("O campo email é obrigatório.");
        }

        if (!cpf) {
            return res.status(400).json("O campo cpf é obrigatório.");
        }

        const query = 'update usuario set nome = $1, idade = $2, email = $3, telefone = $4, cpf = $5 where id = $6';
        const usuarioAtualizado = await conexao.query(query, [nome, idade, email, telefone, cpf, id]);

        if (usuarioAtualizado.rowCount === 0) {
            return res.status(404).json('Não foi possível atualizar o usuario');
        }

        return res.status(200).json('Usuario foi atualizado com sucesso.');
    } catch (error) {
        return res.status(400).json(error.message);
    }
}

const excluirUsuario = async (req, res) => {
    const { id } = req.params;

    try {
        const usuario = await conexao.query('select * from usuarios where id = $1', [id]);

        if (usuario.rowCount === 0) {
            return res.status(404).json('usuario não encontrado');
        }

        const existeEmprestimos = await conexao.query('select * from emprestimos where usuario_id = $1', [id]);

        if (existeEmprestimos.rowCount > 0) {
            return res.status(400).json('Não é possível excluir um usuário que possui emprestimos');
        }

        const query = 'delete from usuarios where id = $1';
        const usuarioExcluido = await conexao.query(query, [id]);

        if (usuarioExcluido.rowCount === 0) {
            return res.status(404).json('Não foi possível excluir o usuario');
        }

        return res.status(200).json('usuario foi excluido com sucesso.');
    } catch (error) {
        return res.status(400).json(error.message);
    }
}

    const login = async (req,res) => {
        const { email , senha } = req.body;
        if (!email) {
            return res.status(400).json("O campo cpf é obrigatório.");
        }
    
        if (!senha) {
            return res.status(400).json("O campo senha é obrigatório.");
        }

        try {
            const query = 'select * from usuarios where email = $1';
            const usuarios = await conexao.query(query,[email]);
    
            if(usuarios.rowCount === 0) {
                return res.status(200).json('e-mail incorreto.')
            }

            const usuario = usuarios.rows[0];
            
            const result = await pwd.verify(Buffer.from(senha), Buffer.from(usuario.senha, "hex"));

            switch (result) {
                case securePassword.INVALID_UNRECOGNIZED_HASH:
                case securePassword. INVALID:
                     return res.status(400).json("Email ou senha incorretos.");
                case securePassword.VALID:
                    break;
                case securePassword.VALID_NEEDS_REHASH:
                    try {
                         const hash = (await pwd.hash(Buffer.from(senha))).tostring("hex");
                         const query =  'update usuarios set senha = $1 where email = $2';
                        await conexao.query(query, [hash, email]);
                      } catch {
                    }
                    break;
            }

            const token = jwt.sign({
                id: usuario.id,
                nome: usuario.nome,
                email: usuario.email

            },jwtSecret);

             return res.json(`Bem vindo, ${usuario.nome}`);

         } catch (error) {
            return res.status(400).json(error.message);
        }
    }

module.exports = {
    listarUsuarios,
    obterUsuario,
    cadastrarUsuario,
    atualizarUsuario,
    excluirUsuario,
    login
}