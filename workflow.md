# Production Workflow Rules

This document specifies the mandatory transitions between stages and their respective department handoffs within the production workflow.

## Teams & Assignment Rules

### Team Directory
* **2**: Operaciones
* **3**: Estrategía
* **4**: Producción
* **5**: Data
* **6**: Comercial
* **7**: Administración
* **8**: MMK
* **9**: Mercado Dinámico
* **10**: ATL

### Assignment Logic
* **Commercial Department (Team 6)**: When a request transitions to a stage handled by the Commercial department, it must **ALWAYS** be assigned to the **creator** of the request.
* **Other Departments**: When a request transitions to a stage handled by any other department, it must be assigned to a **randomly selected user** belonging to that specific team.

## Stage Transitions

### 1. Initiation and Budget Evaluation
* **Start** -> **Quotation** (Commercial Department)
* **Quotation** (Commercial Department) -> *Condition: Budget > 50M* -> **Create Proposal** (Strategy Department)
* **Quotation** (Commercial Department) -> *Condition: Budget <= 50M* -> **Get Data** (Data Department)

### 2. High Budget Path (> 50M)
* **Create Proposal** (Strategy Department) -> **Get Data** (Data Department)
* **Get Data** (Data Department) -> **Validate Proposal** (Strategy Department)
* **Validate Proposal** (Strategy Department) -> **Sales** (Commercial Department)

### 3. Standard Budget Path (<= 50M)
* **Get Data** (Data Department) -> **Sales** (Commercial Department)

### 4. Sales Resolution
* **Sales** (Commercial Department) -> *Condition: Sale Closed Successfully* -> **Consecutive Generation** (Administrative Department)
* **Sales** (Commercial Department) -> *Condition: Sale Not Closed* -> **Closure**

### 5. Post-Sale Operations
* **Consecutive Generation** (Administrative Department) -> **Closed Won** (Commercial Department)
* **Closed Won** (Commercial Department) -> **Material Preparation [SMS / Programmatic / Red+]** (Commercial Department)
* **Material Preparation** (Commercial Department) -> **Implementation** (Operations Department)
* **Implementation** (Operations Department) -> **Customer Review** (Commercial Department)
* **Customer Review** (Commercial Department) -> **Closure**
