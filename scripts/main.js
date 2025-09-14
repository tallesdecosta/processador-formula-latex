function mostrarFormula()
{
    let formulaInput = document.getElementById('formula');
    let formula = formulaInput.value;

    let formulaDisplayer = document.getElementById('formula-displayer');

    formulaDisplayer.textContent = `$$${formula}$$`;
    MathJax.typesetPromise();
    console.log(tokenizar(formula))
    console.log(JSON.stringify(fazerAST(tokenizar(formula)), null, 2));

}


function tokenizar(string)
{

    if(!string)
    {

        return [];

    }

    console.log(string)

    const regex = /\\[a-zA-Z]+|[A-Z]\([a-zA-Z,\s]*\)|[A-Z]|[a-z]|\(|\)/g;
    let stringLimpa = string.replace(/\\left\b|\\right\b/g, '');
    console.log(stringLimpa)
    const tokens = stringLimpa.match(regex);

    return tokens;


}

function fazerAST(tokens) {
    let index = 0;

    function olhar() {
        return tokens[index];
    }

    function consumir() {
        return tokens[index++];
    }

    function processarAtomo() {
        const token = consumir();
        if (token === '(') {
            const formulaNode = processarFormula();
            if (consumir() !== ')') throw new Error("Esperado ')'");
            return formulaNode;
        } else if (token.match(/^[A-Z]/) || token.match(/^[a-z]/)) {
            return { tipo: 'Predicado', nome: token };
        } else {
            throw new Error(`Token inesperado: ${token}`);
        }
    }

    function processarUnario() {
        const token = olhar();
        if (token === '\\neg') {
            consumir();
            return { tipo: 'Negação', valor: processarUnario() };
        } else if (token === '\\forall' || token === '\\exists') {
            const quantificador = consumir();
            const variavel = consumir();
            if (!variavel || !variavel.match(/^[a-z]$/)) {
                throw new Error("Variável esperada após quantificador.");
            }
            const escopo = processarUnario();
            return { tipo: 'Quantificador', quantificador, variavel, escopo: escopo };
        }
        return processarAtomo();
    }

    function processarOperadorBinario(higherPrecedenceParser, operators) {
        let termoEsquerdo = higherPrecedenceParser();
        while (operators.includes(olhar())) {
            const operacao = consumir();
            const termoDireito = higherPrecedenceParser();
            termoEsquerdo = { tipo: 'Binary', operação: operacao, esquerda: termoEsquerdo, direita: termoDireito };
        }
        return termoEsquerdo;
    }

    function processarConjuncao() {
        return processarOperadorBinario(processarUnario, ['\\land']);
    }

    function processarDisjuncao() {
        return processarOperadorBinario(processarConjuncao, ['\\lor']);
    }

    function processarImplicacao() {
        let termoEsquerdo = processarDisjuncao();
        if (olhar() === '\\rightarrow' || olhar() === '\\leftrightarrow') {
            const operacao = consumir();
            const termoDireito = processarImplicacao();
            return { tipo: 'Binary', operação: operacao, esquerda: termoEsquerdo, direita: termoDireito };
        }
        return termoEsquerdo;
    }

    function processarFormula() {
        return processarImplicacao();
    }

    const ast = processarFormula();

    if (index < tokens.length) {
        throw new Error("Tokens inesperados no final da fórmula.");
    }

    return ast;
}

