# MontXML v1.0 | Manual de Operação Premium

O **MontXML** é uma Workstation Fiscal avançada projetada para auditoria, correção e manipulação de documentos fiscais eletrônicos (NFe e CTe) em larga escala.

---

## 🚀 Funcionalidades Principais

### 1. Engine de Processamento Inteligente
- **Parsing Multicamada:** Extração de mais de 25 campos fiscais, incluindo Series, Modelos, Impostos (IPI, PIS, COFINS) e dados de Logística.
- **Detecção de Duplicados:** Filtro proativo no upload que impede o processamento de arquivos repetidos, mantendo a integridade do banco de dados.

### 2. Editor Fiscal de Alta Performance
- **Filtros de Cabeçalho:** Buscas instantâneas em qualquer coluna para isolar dados específicos (Ex: Filtrar por um CNPJ de emitente específico).
- **Edição em Massa (Bulk Edit):** Capacidade de aplicar uma alteração a centenas de linhas simultaneamente. Basta filtrar a visualização e editar uma célula.
- **Sincronização XML Nativa:** Toda alteração na grade é refletida automaticamente na estrutura XML original, sem corromper as tags do governo.

### 3. Interface e Controles
- **Dashboard Glassmorphism:** Visual moderno com foco em usabilidade e redução de fadiga visual.
- **Modo Tela Cheia:** Otimização do espaço de trabalho para auditorias extensas.
- **Formatação Numérica (R$):** Exibição de valores monetários com precisão fiscal (2 casas decimais, separadores de milhar).

---

## 📖 Guia de Uso Passo a Passo

### 1. Importação de Dados
Arraste seus arquivos `.xml` ou pacotes `.zip` para a zona de drop no Dashboard. Se houver duplicados, o sistema alertará imediatamente.

### 2. Auditoria e Filtros
No **Editor Fiscal**, use as caixas de texto acima de cada coluna para pesquisar. Exemplo: Digite um NCM para ver todos os itens com aquela classificação.

### 3. Correção em Lote
Após filtrar os itens desejados, altere uma informação (como o CFOP). Um modal aparecerá perguntando se deseja aplicar a mudança a todas as linhas filtradas. Escolha **"Aplicar a Todas"** para processar o lote.

### 4. Exportação e Resultados
- **Salvar Modificados (ZIP):** Gera um pacote contendo apenas os arquivos que sofreram alteração.
- **Exportar XLSX:** Gera uma planilha Excel consolidada para relatórios externos.

---

## 🛠️ Especificações Técnicas
- **Frontend:** HTML5, CSS3 (Vanilla), JavaScript (ES6+).
- **Grids:** Tabulator v5.5.
- **Processamento:** JSZip & SheetJS.
- **Ícones:** Lucide Icons.

---
*MontXML - Desenvolvido para eficiência fiscal extrema.*
