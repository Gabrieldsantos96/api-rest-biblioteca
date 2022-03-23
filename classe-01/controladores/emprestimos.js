const conexao = require('../conexao');

const listarEmprestimos = async (req, res) => {
    try {
        const query = `
            select e.id, u.nome as usuario, u.telefone, u.email, l.nome as livro, e.status from emprestimos e
            left join usuarios u on e.usuario_id = u.id 
            left join livros l on e.livro_id = l.id
        `;
        const { rows: emprestimos } = await conexao.query(query);
        return res.status(200).json(emprestimos);
    } catch (error) {
        return res.status(400).json(error.message);
    }
}

const obterEmprestimo = async (req, res) => {
    const { id } = req.params;
    try {
        const query = `
            select e.id, u.nome as usuario, u.telefone, u.email, l.nome as livro, e.status from emprestimos e
            left join usuarios u on e.usuario_id = u.id 
            left join livros l on e.livro_id = l.id 
            where id = $1
        `;  // 21 - se possível juntar com a tabela usuarios SE o  empréstimos(usuario_id) for === usuarios(id)
            //22 - se possível juntar com a tabela livros SE o empréstimos(livro_id) for === livros(id)
        const emprestimo = await conexao.query(query, [id]);

        if (emprestimo.rowCount === 0) {
            return res.status(404).json('Emprestimo não encontrado.');
        }

        return res.status(200).json(emprestimo.rows[0]);
    } catch (error) {
        return res.status(400).json(error.message);
    }
}

const realizarEmprestimo = async (req, res) => {
    const { usuario_id, livro_id } = req.body;

    try {
        const livro = await conexao.query('select * from livros where id = $1', [livro_id]);

        if (livro.rowCount === 0) {
            return res.status(404).json('Livro não encontrado');
        }

        const usuario = await conexao.query('select * from usuarios where id = $1', [usuario_id]);

        if (usuario.rowCount === 0) {
            return res.status(404).json('Usuario não encontrado');
        }

        const query = `insert into emprestimos (usuario_id, livro_id) values ($1, $2)`;
        const emprestimoCadastrado = await conexao.query(query, [usuario_id, livro_id]);

        if (emprestimoCadastrado.rowCount === 0) {
            return res.status(400).json('Não foi possivel cadastar o emprestimo');
        }

        return res.status(200).json('Emprestimo cadastrado com sucesso.');
    } catch (error) {
        return res.status(400).json(error.message);
    }
}

const atualizarEmprestimo = async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    if (status !== 'pendente' || status !== 'devolvido') {
        return res.status(400).json('Status informado não existe');
    }

    try {
        const emprestimo = await conexao.query('select * from emprestimos where id = $1', [id]);

        if (emprestimo.rowCount === 0) {
            return res.status(404).json('Emprestimo não encontrado.');
        }

        const query = `update emprestimos set status = $1 where id = $2`;

        const emprestimoAtualizado = await conexao.query(query, [status, id]);

        if (emprestimoAtualizado.rowCount === 0) {
            return res.status(400).json('Não foi possível atualizar o emprestimo');
        }

        return res.status(200).json('O livro foi atualizado com sucesso');
    } catch (error) {
        return res.status(400).json(error.message);
    }
}

const excluirEmprestimo = async (req, res) => {
    const { id } = req.params;

    try {
        const emprestimo = await conexao.query('select * from emprestimos where id = $1', [id]);

        if (emprestimo.rowCount === 0) {
            return res.status(404).json('Emprestimo não encontrado.');
        }

        const query = 'delete from emprestimos where id = $1';
        const emprestimoExcluido = await conexao.query(query, [id]);

        if (emprestimoExcluido.rowCount === 0) {
            return res.status(400).json('Não foi possível excluir o emprestimo')
        }

        return res.status(200).json('O emprestimo foi excluido com sucesso.');
    } catch (error) {
        return res.status(400).json(error.message);
    }
}

module.exports = {
    listarEmprestimos,
    obterEmprestimo,
    realizarEmprestimo,
    atualizarEmprestimo,
    excluirEmprestimo
}