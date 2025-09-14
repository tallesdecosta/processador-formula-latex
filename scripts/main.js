let formulaInput = document.getElementById('formula');

let formulaDisplayer = document.getElementById('formula-displayer');

function mostrarFormula()
{

    formulaDisplayer.textContent = `$$${formulaInput.value}$$`;
    MathJax.typesetPromise();

}

