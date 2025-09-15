// Adicione esta função para limpar os resultados antes de cada conversão

function clearOutputs() {

    document.getElementById('formula-displayer').innerHTML = '';

    document.getElementById('conjuntiva-displayer').innerHTML = '';

    document.getElementById('disjuntiva-displayer').innerHTML = '';

    document.getElementById('clausal-displayer').innerHTML = '';

    document.getElementById('horn-displayer').innerHTML = '';

}



// Sua função principal, agora chamando todas as etapas

function mostrarFormula() {

    // Adicionado para limpar a tela antes de começar

    clearOutputs();



    let formulaInput = document.getElementById('formula');

    let formula = formulaInput.value;



    let formulaDisplayer = document.getElementById('formula-displayer');



    formulaDisplayer.textContent = `$$${formula}$$`;

    MathJax.typesetPromise();

   

    try {



        let tokens = tokenizar(formula);
console.log(tokens)

        let ast = fazerAST(tokens);
console.log(ast)

       

        // Chamadas para todas as conversões

        convertToFNCP(ast);

        convertToFNDP(ast); // Nova chamada

        convertToClausal(ast); // Nova chamada

       

    } catch (error) {



        console.error(error);

        alert("Erro ao processar a fórmula: " + error.message);



    }

}





function tokenizar(string)

{



    if(!string)

    {



        return [];



    }



    console.log(string)



    const regex = /\\[a-zA-Z]+|[A-Z][a-zA-Z]*\([a-zA-Z,\s]*\)|[A-Z]|[a-z]|\(|\)/g;

    let stringLimpa = string.replace(/\\left\b|\\right\b/g, '');

    console.log(stringLimpa)

    const tokens = stringLimpa.match(regex);



    return tokens;





}



function fazerAST(tokens)

{

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



function ast_to_latex(node) {

    if (!node) return '';



    function collectTerms(n, operator) {

        const terms = [];

        if (n.tipo === 'Binary' && n.operação === operator) {

            terms.push(...collectTerms(n.esquerda, operator));

            terms.push(...collectTerms(n.direita, operator));

        } else {

            terms.push(n);

        }

        return terms;

    }



    switch (node.tipo) {

        case 'Predicado':

            return node.nome;



        case 'Negação':

            const innerLatex = ast_to_latex(node.valor);

            if (node.valor.tipo === 'Binary' || node.valor.tipo === 'Quantificador') {

                return `\\neg(${innerLatex})`;

            }

            return `\\neg ${innerLatex}`;



        case 'Binary':

            if (node.operação === '\\lor' || node.operação === '\\land') {

                const terms = collectTerms(node, node.operação);

                const latexTerms = terms.map(term => ast_to_latex(term));

                return `(${latexTerms.join(` ${node.operação} `)})`;

            } else {

                const left = ast_to_latex(node.esquerda);

                const right = ast_to_latex(node.direita);

                return `(${left} ${node.operação} ${right})`;

            }



        case 'Quantificador': // A MUDANÇA ESTÁ AQUI

            const scopeLatex = ast_to_latex(node.escopo);

            // Só adiciona parênteses se o escopo for uma operação binária

            if (node.escopo.tipo === 'Binary') {

                return `${node.quantificador} ${node.variavel} ${scopeLatex}`; // scopeLatex já tem parênteses

            }

            // Se for outro quantificador ou um predicado, não precisa de parênteses extras

            return `${node.quantificador} ${node.variavel} ${scopeLatex}`;



        default:

            throw new Error(`Tipo de nó desconhecido para conversão em LaTeX: ${node.tipo}`);

    }

}



function deepCopy(obj) {



    return JSON.parse(JSON.stringify(obj));



}



// Substitua sua função inteira por esta versão corrigida

function eliminate_implications(node) {

    if (!node) return null;



    // 1. Processa os filhos primeiro (recursão post-order).

    // Isso garante que quando olharmos para um nó, seus filhos já estão livres de implicações.

    if (node.esquerda) node.esquerda = eliminate_implications(node.esquerda);

    if (node.direita) node.direita = eliminate_implications(node.direita);

    if (node.valor) node.valor = eliminate_implications(node.valor);

    if (node.escopo) node.escopo = eliminate_implications(node.escopo);

   

    // 2. Agora, processa o nó atual.

    if (node.tipo === 'Binary') {

        if (node.operação === '\\leftrightarrow') {

            // A e B já foram processados pela recursão acima.

            const a = node.esquerda;

            const b = node.direita;



            const a_implies_b = { tipo: 'Binary', operação: '\\rightarrow', esquerda: a, direita: b };

            const b_implies_a = { tipo: 'Binary', operação: '\\rightarrow', esquerda: deepCopy(b), direita: deepCopy(a) };



            // Expande A ↔ B para (A → B) ∧ (B → A)

            const newNode = {

                tipo: 'Binary',

                operação: '\\land',

                esquerda: a_implies_b,

                direita: b_implies_a

            };

           

            // CORREÇÃO: Não retorna uma chamada recursiva aqui.

            // Em vez disso, processa o newNode para remover os '→' que acabamos de criar.

            // Isso pode ser feito chamando a função nos filhos do newNode.

            newNode.esquerda = eliminate_implications(newNode.esquerda);

            newNode.direita = eliminate_implications(newNode.direita);

            return newNode;

        }

       

        if (node.operação === '\\rightarrow') {

            // Transforma A → B em ¬A ∨ B

            const not_a = { tipo: 'Negação', valor: node.esquerda };

            return {

                tipo: 'Binary',

                operação: '\\lor',

                esquerda: not_a,

                direita: node.direita

            };

        }

    }



    return node;

}



function move_negations_in(node) {

    if (!node) return null;



    // Processa os filhos primeiro

    if (node.esquerda) node.esquerda = move_negations_in(node.esquerda);

    if (node.direita) node.direita = move_negations_in(node.direita);

    if (node.valor) node.valor = move_negations_in(node.valor);

    if (node.escopo) node.escopo = move_negations_in(node.escopo);

   

    // Processa o nó atual

    if (node.tipo === 'Negação') {

        const innerNode = node.valor;



        // Caso 1: Dupla negação (¬¬A => A)

        if (innerNode.tipo === 'Negação') {

            return innerNode.valor;

        }

       

        // Caso 2: Leis de De Morgan (¬(A ∧ B) => ¬A ∨ ¬B e vice-versa)

        if (innerNode.tipo === 'Binary') {

            const not_a = move_negations_in({ tipo: 'Negação', valor: innerNode.esquerda });

            const not_b = move_negations_in({ tipo: 'Negação', valor: innerNode.direita });

           

            if (innerNode.operação === '\\land') {

                return { tipo: 'Binary', operação: '\\lor', esquerda: not_a, direita: not_b };

            }

            if (innerNode.operação === '\\lor') {

                return { tipo: 'Binary', operação: '\\land', esquerda: not_a, direita: not_b };

            }

        }



        // Caso 3: Negação de Quantificadores (¬∀x P(x) => ∃x ¬P(x) e vice-versa)

        if (innerNode.tipo === 'Quantificador') {

            const negatedScope = move_negations_in({ tipo: 'Negação', valor: innerNode.escopo });

           

            if (innerNode.quantificador === '\\forall') {

                return { tipo: 'Quantificador', quantificador: '\\exists', variavel: innerNode.variavel, escopo: negatedScope };

            }

            if (innerNode.quantificador === '\\exists') {

                return { tipo: 'Quantificador', quantificador: '\\forall', variavel: innerNode.variavel, escopo: negatedScope };

            }

        }

    }



    return node;

}



function getNewVarName(existingVars) {

    const alphabet = 'uvwxyzabcdefghijklmnopqrst';

    for (const char of alphabet) {

        if (!existingVars.has(char)) {

            return char;

        }

    }

    // Caso o alfabeto acabe, adiciona números

    for (let i = 1; ; i++) {

        const newVar = `v${i}`;

        if (!existingVars.has(newVar)) {

            return newVar;

        }

    }

}



// Função principal para padronizar as variáveis

// Substitua sua função standardize_variables inteira por esta:

function standardize_variables(node) {



    // Função auxiliar para encontrar todas as variáveis existentes na fórmula.

    function getAllVars(n, collected = new Set()) {

        if (!n) return collected;

        if (n.tipo === 'Quantificador') {

            collected.add(n.variavel);

        }

        // Extrai variáveis de dentro dos predicados também, ex: P(x, y)

        if (n.tipo === 'Predicado' && n.nome.includes('(')) {

             const varsInPredicate = n.nome.substring(n.nome.indexOf('(') + 1, n.nome.indexOf(')')).split(',');

             varsInPredicate.forEach(v => collected.add(v.trim()));

        }

        getAllVars(n.esquerda, collected);

        getAllVars(n.direita, collected);

        getAllVars(n.valor, collected);

        getAllVars(n.escopo, collected);

        return collected;

    }



    const allVars = getAllVars(node);

    let varCounter = 1;



    // Gera um novo nome de variável que ainda não existe na fórmula.

    function generateNewName(baseVar) {

        let newName = `${baseVar}${varCounter++}`;

        while(allVars.has(newName)) {

            newName = `${baseVar}${varCounter++}`;

        }

        allVars.add(newName);

        return newName;

    }



    // Função recursiva que efetivamente renomeia as variáveis.

    function traverse(n, mapping) {

        if (!n) return null;



        if (n.tipo === 'Predicado') {

            let newName = n.nome;

            for (const oldVar in mapping) {

                const regex = new RegExp(`\\b${oldVar}\\b`, 'g');

                newName = newName.replace(regex, mapping[oldVar]);

            }

            return { ...n, nome: newName };

        }



        if (n.tipo === 'Quantificador') {

            const oldVar = n.variavel;

            // Cria um novo nome único para esta variável quantificada.

            const newVar = generateNewName(oldVar);

           

            // Cria um novo mapeamento para o escopo deste quantificador.

            const newMapping = { ...mapping };

            newMapping[oldVar] = newVar;



            const newScope = traverse(n.escopo, newMapping);

            return { ...n, variavel: newVar, escopo: newScope };

        }

       

        // Para nós binários ou de negação, continua a travessia com o mapeamento atual.

        if (n.esquerda) n.esquerda = traverse(n.esquerda, mapping);

        if (n.direita) n.direita = traverse(n.direita, mapping);

        if (n.valor) n.valor = traverse(n.valor, mapping);



        return n;

    }



    return traverse(node, {});

}







function move_quantifiers_out(node) {

    if (!node || node.tipo === 'Predicado') {

        return { quantifiers: [], matrix: node };

    }



    if (node.tipo === 'Quantificador') {

        const result = move_quantifiers_out(node.escopo);

        const currentQuantifier = { quantificador: node.quantificador, variavel: node.variavel };

        return {

            quantifiers: [currentQuantifier, ...result.quantifiers],

            matrix: result.matrix

        };

    }

   

    if (node.tipo === 'Negação') {

        const result = move_quantifiers_out(node.valor);

        return {

            quantifiers: result.quantifiers,

            matrix: { tipo: 'Negação', valor: result.matrix }

        };

    }



    if (node.tipo === 'Binary') {

        const leftResult = move_quantifiers_out(node.esquerda);

        const rightResult = move_quantifiers_out(node.direita);

        return {

            quantifiers: [...leftResult.quantifiers, ...rightResult.quantifiers],

            matrix: {

                tipo: 'Binary',

                operação: node.operação,

                esquerda: leftResult.matrix,

                direita: rightResult.matrix

            }

        };

    }

   

    return { quantifiers: [], matrix: node };

}



// Substitua a função distribute_or_over_and inteira por esta:

function distribute_or_over_and(node) {

    let changed = true;

    let ast = node;



    // Aplica as regras de distribuição repetidamente até que a fórmula não mude mais.

    while (changed) {

        changed = false;

        ast = apply_distribution_rule(ast);

    }

    return ast;



    // Função recursiva que aplica a regra de distribuição UMA VEZ.

    function apply_distribution_rule(n) {

        if (!n || changed) return n;



        if (n.tipo === 'Binary' && n.operação === '\\lor') {

            // Caso 1: (A ∧ B) ∨ C  =>  (A ∨ C) ∧ (B ∨ C)

            if (n.esquerda.tipo === 'Binary' && n.esquerda.operação === '\\land') {

                changed = true;

                const a = n.esquerda.esquerda;

                const b = n.esquerda.direita;

                const c = n.direita;

                return {

                    tipo: 'Binary',

                    operação: '\\land',

                    esquerda: apply_distribution_rule({ tipo: 'Binary', operação: '\\lor', esquerda: a, direita: c }),

                    direita: apply_distribution_rule({ tipo: 'Binary', operação: '\\lor', esquerda: b, direita: deepCopy(c) })

                };

            }

            // Caso 2: A ∨ (B ∧ C)  =>  (A ∨ B) ∧ (A ∨ C)

            if (n.direita.tipo === 'Binary' && n.direita.operação === '\\land') {

                changed = true;

                const a = n.esquerda;

                const b = n.direita.esquerda;

                const c = n.direita.direita;

                return {

                    tipo: 'Binary',

                    operação: '\\land',

                    esquerda: apply_distribution_rule({ tipo: 'Binary', operação: '\\lor', esquerda: a, direita: b }),

                    direita: apply_distribution_rule({ tipo: 'Binary', operação: '\\lor', esquerda: deepCopy(a), direita: c })

                };

            }

        }

       

        // Se nenhuma regra foi aplicada, continua a busca nos filhos.

        if (n.esquerda) n.esquerda = apply_distribution_rule(n.esquerda);

        if (n.direita) n.direita = apply_distribution_rule(n.direita);

        if (n.valor) n.valor = apply_distribution_rule(n.valor);

        if (n.escopo) n.escopo = apply_distribution_rule(n.escopo);



        return n;

    }

}

// Função auxiliar para renderizar cada passo

function renderStep(elementId, stepLatex, description = '') {

    const container = document.getElementById(elementId);

    const p = document.createElement('p');

    let content = description ? `<b>${description}:</b> ` : '';

    content += `$$${stepLatex}$$`;

    p.innerHTML = content;

    container.appendChild(p);

    // Pede ao MathJax para renderizar o novo conteúdo

    MathJax.typesetPromise([p]);

}









function convertToFNCP(originalAst) {

    const containerId = 'conjuntiva-displayer';

    let ast = deepCopy(originalAst);

    renderStep(containerId, ast_to_latex(ast), 'Fórmula Original');

   

    let previousLatex = ast_to_latex(ast);

    let currentLatex;



    // Passo 1: Eliminar Implicações

    ast = eliminate_implications(ast);

    currentLatex = ast_to_latex(ast);

    if (currentLatex !== previousLatex) {

        renderStep(containerId, currentLatex, '1. Eliminar Implicações');

        previousLatex = currentLatex;

    }

   

    // Passo 2: Mover Negações para Dentro

    ast = move_negations_in(ast);

    currentLatex = ast_to_latex(ast);

    if (currentLatex !== previousLatex) {

        renderStep(containerId, currentLatex, '2. Mover Negações (De Morgan)');

        previousLatex = currentLatex;

    }



    // Passo 3: Padronizar Variáveis

    ast = standardize_variables(ast);

    currentLatex = ast_to_latex(ast);

    if (currentLatex !== previousLatex) {

        renderStep(containerId, currentLatex, '3. Padronizar Variáveis');

        previousLatex = currentLatex;

    }



    // Passo 4: Mover Quantificadores (Forma Prenex)

    const prenexResult = move_quantifiers_out(ast);

    // Remonta a AST a partir do resultado

    let prenexAst = prenexResult.matrix;

    for (let i = prenexResult.quantifiers.length - 1; i >= 0; i--) {

        const q = prenexResult.quantifiers[i];

        prenexAst = { tipo: 'Quantificador', quantificador: q.quantificador, variavel: q.variavel, escopo: prenexAst };

    }

    ast = prenexAst;

    currentLatex = ast_to_latex(ast);

    if (currentLatex !== previousLatex) {

        renderStep(containerId, currentLatex, '4. Mover Quantificadores (Forma Prenex)');

        previousLatex = currentLatex;

    }



    // Passo 5: Aplicar Distributividade para FNC

    ast = distribute_or_over_and(ast);

    currentLatex = ast_to_latex(ast);

    if (currentLatex !== previousLatex) {

        renderStep(containerId, currentLatex, '5. Distribuir ∨ sobre ∧ (FNC)');

        previousLatex = currentLatex;

    }

   

    renderStep(containerId, ast_to_latex(ast), 'Resultado Final (FNCP)');

}



// --- NOVOS ORQUESTRADORES DE CONVERSÃO ---



function convertToFNDP(originalAst) {

    const containerId = 'disjuntiva-displayer';

    let ast = deepCopy(originalAst);

    renderStep(containerId, ast_to_latex(ast), 'Fórmula Original');



    ast = eliminate_implications(ast);

    ast = move_negations_in(ast);

    ast = standardize_variables(ast);

   

    const prenexResult = move_quantifiers_out(ast);

    let prenexAst = prenexResult.matrix;

    for (let i = prenexResult.quantifiers.length - 1; i >= 0; i--) {

        const q = prenexResult.quantifiers[i];

        prenexAst = { tipo: 'Quantificador', quantificador: q.quantificador, variavel: q.variavel, escopo: prenexAst };

    }

    ast = prenexAst;



    ast = distribute_and_over_or(ast);

   

    renderStep(containerId, ast_to_latex(ast), 'Resultado Final (FNDP)');

}



// Substitua a função convertToClausal inteira por esta:

// Substitua a função convertToClausal inteira por esta:
// Substitua a função convertToClausal inteira por esta versão que segue os slides
function convertToClausal(originalAst) {
    const clausalContainerId = 'clausal-displayer';
    const hornContainerId = 'horn-displayer';
    let ast = deepCopy(originalAst);

    // Etapas para chegar na Forma Prenex (Passos 1-4 dos slides)
    ast = eliminate_implications(ast);
    ast = move_negations_in(ast);
    ast = standardize_variables(ast);
    const prenexResult = move_quantifiers_out(ast);
    let prenexAst = prenexResult.matrix;
    for (let i = prenexResult.quantifiers.length - 1; i >= 0; i--) {
        const q = prenexResult.quantifiers[i];
        prenexAst = { tipo: 'Quantificador', quantificador: q.quantificador, variavel: q.variavel, escopo: prenexAst };
    }
    renderStep(clausalContainerId, ast_to_latex(prenexAst), 'Base (Forma Prenex)');

    // --- ORDEM CORRIGIDA PARA CORRESPONDER AOS SLIDES ---

    // Passo 5 dos slides: Skolemização (eliminar ∃)
    let skolemizedAst = skolemize(prenexAst);
    renderStep(clausalContainerId, ast_to_latex(skolemizedAst), '1. Skolemização');
    
    // Passo 6 dos slides: Remover quantificadores universais (∀) para obter a matriz
    let matrix = drop_universal_quantifiers(skolemizedAst);
    renderStep(clausalContainerId, ast_to_latex(matrix), '2. Remoção de ∀ (Matriz)');
    
    // Passo 7 dos slides: Converter a matriz para FNC
    matrix = distribute_or_over_and(matrix);
    renderStep(clausalContainerId, ast_to_latex(matrix), '3. Matriz em FNC');

    // Passo final: Extrair as cláusulas da matriz em FNC
    const clauses = matrix_to_clauses(matrix);

    const title = document.createElement('p');
    title.innerHTML = `<b>4. Cláusulas Finais:</b>`;
    document.getElementById(clausalContainerId).appendChild(title);

    clauses.forEach((clause, index) => {
        const clauseText = clause.join(' \\lor ');
        const p = document.createElement('p');
        p.innerHTML = `<span style="color:darkred; font-weight:bold; margin-right: 10px;">${index + 1}.</span> <span>$$${clauseText}$$</span>`;
        document.getElementById(clausalContainerId).appendChild(p);
        MathJax.typesetPromise([p]);
    });

    identifyHornClauses(clauses, hornContainerId);
}




// --- NOVAS FUNÇÕES DE TRANSFORMAÇÃO ---



function distribute_and_over_or(node) {

    if (!node || node.tipo !== 'Binary') {

        if (node && node.escopo) node.escopo = distribute_and_over_or(node.escopo);

        if (node && node.valor) node.valor = distribute_and_over_or(node.valor);

        return node;

    }



    node.esquerda = distribute_and_over_or(node.esquerda);

    node.direita = distribute_and_over_or(node.direita);



    if (node.operação === '\\land') {

        if (node.direita.tipo === 'Binary' && node.direita.operação === '\\lor') {

            const a = node.esquerda;

            const b = node.direita.esquerda;

            const c = node.direita.direita;

            const newLeft = { tipo: 'Binary', operação: '\\land', esquerda: a, direita: b };

            const newRight = { tipo: 'Binary', operação: '\\land', esquerda: deepCopy(a), direita: c };

            const newNode = { tipo: 'Binary', operação: '\\lor', esquerda: newLeft, direita: newRight };

            return distribute_and_over_or(newNode);

        }

        if (node.esquerda.tipo === 'Binary' && node.esquerda.operação === '\\lor') {

            const a = node.esquerda.esquerda;

            const b = node.esquerda.direita;

            const c = node.direita;

            const newLeft = { tipo: 'Binary', operação: '\\land', esquerda: a, direita: c };

            const newRight = { tipo: 'Binary', operação: '\\land', esquerda: b, direita: deepCopy(c) };

            const newNode = { tipo: 'Binary', operação: '\\lor', esquerda: newLeft, direita: newRight };

            return distribute_and_over_or(newNode);

        }

    }

    return node;

}



function skolemize(node) {

    let skolemConstantIndex = 0;

    let skolemFunctionIndex = 0;



    function getNewConstantName() { return `c_{${++skolemConstantIndex}}`; }

    function getNewFunctionName() { return `f_{${++skolemFunctionIndex}}`; }



    function traverse(n, universalVars = []) {

        if (!n) return null;



        if (n.tipo === 'Quantificador') {

            if (n.quantificador === '\\forall') {

                return { ...n, escopo: traverse(n.escopo, [...universalVars, n.variavel]) };

            }

            if (n.quantificador === '\\exists') {

                let replacement;

                if (universalVars.length === 0) {

                    replacement = getNewConstantName();

                } else {

                    replacement = `${getNewFunctionName()}(${universalVars.join(', ')})`;

                }

                const newScope = substitute(n.escopo, n.variavel, replacement);

                return traverse(newScope, universalVars);

            }

        }

       

        if (n.esquerda) n.esquerda = traverse(n.esquerda, universalVars);

        if (n.direita) n.direita = traverse(n.direita, universalVars);

        if (n.valor) n.valor = traverse(n.valor, universalVars);



        return n;

    }



    function substitute(n, oldVar, newTerm) {

        if (!n) return null;

        if (n.tipo === 'Predicado') {

            const regex = new RegExp(`\\b${oldVar}\\b`, 'g');

            const newName = n.nome.replace(regex, newTerm);

            return { ...n, nome: newName };

        }

       

        if (n.esquerda) n.esquerda = substitute(n.esquerda, oldVar, newTerm);

        if (n.direita) n.direita = substitute(n.direita, oldVar, newTerm);

        if (n.valor) n.valor = substitute(n.valor, oldVar, newTerm);

        if (n.escopo) n.escopo = substitute(n.escopo, oldVar, newTerm);

       

        return n;

    }



    return traverse(node);

}



function drop_universal_quantifiers(node) {

    if (!node) return null;

    if (node.tipo === 'Quantificador' && node.quantificador === '\\forall') {

        return drop_universal_quantifiers(node.escopo);

    }

    if (node.esquerda) node.esquerda = drop_universal_quantifiers(node.esquerda);

    if (node.direita) node.direita = drop_universal_quantifiers(node.direita);

    if (node.valor) node.valor = drop_universal_quantifiers(node.valor);

   

    return node;

}



function matrix_to_clauses(matrixNode) {

    function collectLiterals(clauseNode) {

        if (clauseNode.tipo === 'Binary' && clauseNode.operação === '\\lor') {

            return [...collectLiterals(clauseNode.esquerda), ...collectLiterals(clauseNode.direita)];

        }

        return [ast_to_latex(clauseNode)];

    }



    if (matrixNode.tipo === 'Binary' && matrixNode.operação === '\\land') {

        return [...matrix_to_clauses(matrixNode.esquerda), ...matrix_to_clauses(matrixNode.direita)];

    }

    return [collectLiterals(matrixNode)];

}



function identifyHornClauses(clauses, containerId) {

    renderStep(containerId, '', 'Análise de Cláusulas de Horn:');

    let hornClausesFound = 0;



    clauses.forEach(clause => {

        const positiveLiterals = clause.filter(lit => !lit.trim().startsWith('\\neg'));

       

        if (positiveLiterals.length <= 1) {

            hornClausesFound++;

            let hornLatex = '';

            const negativeLiterals = clause.filter(lit => lit.trim().startsWith('\\neg'));

            const body = negativeLiterals.map(lit => lit.replace('\\neg', '').trim()).join(' \\land ');



            if (positiveLiterals.length === 1) { // Cláusula definida

                const head = positiveLiterals[0];

                if (body) {

                    hornLatex = `${body} \\rightarrow ${head}`;

                } else { // Fato

                    hornLatex = `true \\rightarrow ${head}`;

                }

            } else { // Cláusula objetivo

                if (body) {

                    hornLatex = `${body} \\rightarrow false`;

                } else { // Cláusula vazia

                    hornLatex = `true \\rightarrow false`;

                }

            }

            renderStep(containerId, `\\{ ${clause.join(', ')} \\} \\Rightarrow ${hornLatex}`);

        }

    });



    if (hornClausesFound === 0) {

        const p = document.createElement('p');

        p.textContent = 'Nenhuma Cláusula de Horn encontrada.';

        document.getElementById(containerId).appendChild(p);

    }

}