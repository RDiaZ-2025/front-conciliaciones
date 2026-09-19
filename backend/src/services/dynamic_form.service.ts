import { AppDataSource } from "../config/typeorm.config";
import {
  DynamicForm,
  DynamicFormField,
  DynamicFormFieldValue,
  DynamicWorkflow,
  DynamicWorkflowStage,
  DynamicSubmissionWorkflowState,
  DynamicFormSubmission
} from "../models";
import { In } from "typeorm";

export class DynamicFormService {
  /**
   * Obtiene los tipos de solicitudes basados en formularios dinámicos activos
   */
  async getRequestTypes() {
    if (!AppDataSource.isInitialized) throw new Error('Base de datos no disponible');
    const types = await AppDataSource.getRepository(DynamicForm).find({
      where: { isEntryForm: true, isActive: true, isInitialForm: false },
      order: { id: 'ASC' }
    });
    return types.map(t => {
      let parsedMeta = t.metadata;
      if (parsedMeta && typeof parsedMeta === 'string') {
        try { parsedMeta = JSON.parse(parsedMeta); } catch (e) { }
      }
      return {
        ...t,
        metadata: parsedMeta || {}
      };
    });
  }

  /**
   * Obtiene el formulario inicial configurado para nuevos flujos
   */
  async getInitialForm() {
    if (!AppDataSource.isInitialized) throw new Error('Base de datos no disponible');
    return await AppDataSource.getRepository(DynamicForm).find({
      where: { isInitialForm: true, isActive: true },
      order: { displayOrder: 'ASC', id: 'ASC' }
    });
  }

  /**
   * Sanitiza metadatos de campos dinámicos (opciones y dependencias)
   */
  sanitizeFieldMetadata(meta: any): any {
    if (!meta) return null;
    let obj = meta;
    if (typeof obj === 'string') {
      try { obj = JSON.parse(obj); } catch (e) { return meta; }
    }
    if (typeof obj !== 'object' || obj === null) return obj;

    if (Array.isArray(obj.options)) {
      obj.options = obj.options
        .map((opt: any) => typeof opt === 'object' && opt !== null ? (opt.value ?? opt.label ?? '') : String(opt ?? ''))
        .map((s: string) => s.trim())
        .filter((s: string) => s && s !== 'null' && s !== '_null' && s !== 'undefined');
    }

    if (obj.dependency) {
      const op = obj.dependency.operator || 'eq';
      obj.dependency.operator = op;

      if (op === 'is_empty' || op === 'is_not_empty') {
        obj.dependency.value = '';
      } else if (['gt', 'gte', 'lt', 'lte'].includes(op)) {
        if (typeof obj.dependency.value === 'string') {
          obj.dependency.value = obj.dependency.value.trim();
        } else if (obj.dependency.value === null || obj.dependency.value === undefined) {
          obj.dependency.value = '';
        }
      } else {
        if (Array.isArray(obj.dependency.value)) {
          obj.dependency.value = obj.dependency.value
            .map((v: any) => typeof v === 'object' && v !== null ? (v.value ?? v.label ?? '') : String(v ?? ''))
            .map((s: string) => s.trim())
            .filter((s: string) => s && s !== 'null' && s !== '_null' && s !== 'undefined');
          if (obj.dependency.value.length === 1) obj.dependency.value = obj.dependency.value[0];
          else if (obj.dependency.value.length === 0) obj.dependency.value = '';
        } else if (typeof obj.dependency.value === 'string') {
          const clean = obj.dependency.value
            .split(',')
            .map((s: string) => s.trim())
            .filter((s: string) => s && s !== 'null' && s !== '_null' && s !== 'undefined');
          obj.dependency.value = clean.length > 1 ? clean : (clean[0] || '');
        } else if (obj.dependency.value === null || obj.dependency.value === undefined) {
          obj.dependency.value = '';
        }
      }
    }
    return obj;
  }

  /**
   * Obtiene los campos de un formulario con metadatos sanitizados
   */
  async getFormFields(formId: number, includeInactive: boolean = false) {
    if (!AppDataSource.isInitialized) throw new Error('Base de datos no disponible');
    const whereClause: any = { formId };
    if (!includeInactive) {
      whereClause.isActive = true;
    }
    const fields = await AppDataSource.getRepository(DynamicFormField).find({
      where: whereClause,
      order: { displayOrder: 'ASC' }
    });
    return fields.map(f => {
      if (f.metadata) {
        const sanitized = this.sanitizeFieldMetadata(f.metadata);
        f.metadata = typeof sanitized === 'object' ? JSON.stringify(sanitized) : sanitized;
      }
      return f;
    });
  }

  /**
   * Lista todos los formularios para administración
   */
  async adminGetForms() {
    if (!AppDataSource.isInitialized) throw new Error('Base de datos no disponible');
    return await AppDataSource.getRepository(DynamicForm).find({
      order: { name: 'ASC' }
    });
  }

  /**
   * Crea un nuevo formulario dinámico vinculándolo con workflow si aplica
   */
  async adminCreateForm(data: Partial<DynamicForm>) {
    if (!AppDataSource.isInitialized) throw new Error('Base de datos no disponible');
    const repo = AppDataSource.getRepository(DynamicForm);
    const wfRepo = AppDataSource.getRepository(DynamicWorkflow);

    let targetWfId = data.workflowId || null;
    if (!targetWfId && data.isEntryForm && !data.isInitialForm) {
      const wfName = `Flujo: ${data.name}`;
      let existingWf = await wfRepo.findOne({ where: { name: wfName } });
      if (!existingWf) {
        existingWf = await wfRepo.save(wfRepo.create({
          name: wfName,
          description: data.description || `Flujo para ${data.name}`,
          isActive: true
        }));
      }
      targetWfId = existingWf.id;
    }

    const form = repo.create({
      name: data.name,
      description: data.description,
      isEntryForm: data.isEntryForm ?? true,
      isInitialForm: data.isInitialForm ?? false,
      isActive: data.isActive ?? true,
      responsible: data.responsible,
      role: data.role,
      icon: data.icon,
      displayOrder: data.displayOrder ?? 0,
      metadata: data.metadata,
      workflowId: targetWfId
    });
    return await repo.save(form);
  }

  /**
   * Actualiza propiedades de un formulario existente
   */
  async adminUpdateForm(id: number, data: Partial<DynamicForm>) {
    if (!AppDataSource.isInitialized) throw new Error('Base de datos no disponible');
    const repo = AppDataSource.getRepository(DynamicForm);
    const form = await repo.findOne({ where: { id } });
    if (!form) throw new Error('Formulario no encontrado');

    const updateData: Partial<DynamicForm> = {};
    if (data.isInitialForm !== undefined) updateData.isInitialForm = Boolean(data.isInitialForm);
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.isEntryForm !== undefined) updateData.isEntryForm = Boolean(data.isEntryForm);
    if (data.isActive !== undefined) updateData.isActive = Boolean(data.isActive);
    if (data.responsible !== undefined) updateData.responsible = data.responsible;
    if (data.role !== undefined) updateData.role = data.role;
    if (data.icon !== undefined) updateData.icon = data.icon;
    if (data.displayOrder !== undefined) updateData.displayOrder = Number(data.displayOrder);
    if (data.metadata !== undefined) updateData.metadata = data.metadata;
    if (data.workflowId !== undefined) updateData.workflowId = data.workflowId;

    await repo.update({ id }, updateData);
    return await repo.findOne({ where: { id } });
  }

  /**
   * Elimina un formulario de forma lógica (isActive = false) o física con limpieza en cascada
   */
  async adminDeleteForm(id: number, physicalDelete: boolean = false) {
    if (!AppDataSource.isInitialized) throw new Error('Base de datos no disponible');

    const numericId = Number(id);
    if (!Number.isInteger(numericId) || numericId <= 0) {
      throw new Error('ID de formulario inválido');
    }

    if (physicalDelete) {
      return await AppDataSource.transaction(async (manager) => {
        // 1. Unlink form from any workflow stage pointing to it as form to fill
        await manager.query(`UPDATE DynamicWorkflowStages SET FormIdToFill = NULL WHERE FormIdToFill = @0;`, [numericId]);

        // 2. Unlink any submission parent/children and clear currentStageId
        await manager.query(`
          UPDATE DynamicFormSubmissions 
          SET ParentSubmissionId = NULL, CurrentStageId = NULL 
          WHERE FormId = @0 OR ParentSubmissionId IN (SELECT Id FROM DynamicFormSubmissions WHERE FormId = @0);
        `, [numericId]);

        // 3. Nullify WorkflowStateId on DynamicFormFieldValues if column exists
        await manager.query(`
          IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('DynamicFormFieldValues') AND name = 'WorkflowStateId')
          BEGIN
            UPDATE DynamicFormFieldValues SET WorkflowStateId = NULL 
            WHERE FieldId IN (SELECT Id FROM DynamicFormFields WHERE FormId = @0)
               OR SubmissionId IN (SELECT Id FROM DynamicFormSubmissions WHERE FormId = @0);
          END
        `, [numericId]);

        // 4. Delete DynamicFormFieldValues
        await manager.query(`
          DELETE FROM DynamicFormFieldValues 
          WHERE FieldId IN (SELECT Id FROM DynamicFormFields WHERE FormId = @0)
             OR SubmissionId IN (SELECT Id FROM DynamicFormSubmissions WHERE FormId = @0);
        `, [numericId]);

        // 5. Delete DynamicSubmissionWorkflowState
        await manager.query(`
          DELETE FROM DynamicSubmissionWorkflowState 
          WHERE SubmissionId IN (SELECT Id FROM DynamicFormSubmissions WHERE FormId = @0)
             OR StageId IN (SELECT Id FROM DynamicWorkflowStages WHERE FormId = @0);
        `, [numericId]);

        // 6. Delete DynamicFormSubmissions
        await manager.query(`DELETE FROM DynamicFormSubmissions WHERE FormId = @0;`, [numericId]);

        // 7. Delete DynamicFormFields
        await manager.query(`DELETE FROM DynamicFormFields WHERE FormId = @0;`, [numericId]);

        // 8. Delete DynamicWorkflowStages where FormId is this form
        await manager.query(`DELETE FROM DynamicWorkflowStages WHERE FormId = @0;`, [numericId]);

        // 9. Unlink workflowId on this form
        await manager.query(`UPDATE DynamicForms SET WorkflowId = NULL WHERE Id = @0;`, [numericId]);

        // 10. Delete the form
        await manager.query(`DELETE FROM DynamicForms WHERE Id = @0;`, [numericId]);

        return { id: numericId, deleted: true };
      });
    } else {
      const repo = AppDataSource.getRepository(DynamicForm);
      await repo.update({ id: numericId }, { isActive: false });
      return await repo.findOne({ where: { id: numericId } });
    }
  }

  /**
   * Guarda o actualiza campos de un formulario y limpia campos removidos
   */
  async adminSaveFields(formId: number, fields: Partial<DynamicFormField>[]) {
    if (!AppDataSource.isInitialized) throw new Error('Base de datos no disponible');
    return await AppDataSource.transaction(async (manager) => {
      const fieldRepo = manager.getRepository(DynamicFormField);

      // Fetch existing field IDs to know what to delete
      const existingFields = await fieldRepo.find({ where: { formId } });
      const inputIds = fields.map(f => f.id).filter(id => !!id) as number[];

      // Delete fields that are not in the input list (Cascade delete values and field itself)
      const fieldsToDelete = existingFields.filter(ef => !inputIds.includes(ef.id));
      if (fieldsToDelete.length > 0) {
        const ids = fieldsToDelete.map(f => f.id);
        await manager.getRepository(DynamicFormFieldValue).delete({ fieldId: In(ids) });
        await fieldRepo.remove(fieldsToDelete);
      }

      // Insert or Update fields
      const savedFields = [];
      for (let i = 0; i < fields.length; i++) {
        const f = fields[i];
        let fieldEntity = existingFields.find(ef => ef.id === f.id);

        const metaSanitized = f.metadata ? this.sanitizeFieldMetadata(f.metadata) : null;
        const metaString = metaSanitized ? JSON.stringify(metaSanitized) : null;

        if (!fieldEntity) {
          fieldEntity = fieldRepo.create({
            formId,
            name: f.name || `field_${Date.now()}_${i}`,
            label: f.label || 'Campo nuevo',
            description: f.description,
            type: f.type || 'text',
            placeholder: f.placeholder,
            isRequired: f.isRequired ?? false,
            isReadOnly: f.isReadOnly ?? false,
            isActive: f.isActive ?? true,
            defaultValueExpression: f.defaultValueExpression,
            displayOrder: f.displayOrder ?? (i + 1),
            metadata: metaString
          });
        } else {
          if (f.name !== undefined) fieldEntity.name = f.name;
          if (f.label !== undefined) fieldEntity.label = f.label;
          if (f.description !== undefined) fieldEntity.description = f.description;
          if (f.type !== undefined) fieldEntity.type = f.type;
          if (f.placeholder !== undefined) fieldEntity.placeholder = f.placeholder;
          if (f.isRequired !== undefined) fieldEntity.isRequired = f.isRequired;
          if (f.isReadOnly !== undefined) fieldEntity.isReadOnly = f.isReadOnly;
          if (f.isActive !== undefined) fieldEntity.isActive = f.isActive;
          if (f.defaultValueExpression !== undefined) fieldEntity.defaultValueExpression = f.defaultValueExpression;
          if (f.displayOrder !== undefined) fieldEntity.displayOrder = f.displayOrder;
          if (f.metadata !== undefined) fieldEntity.metadata = metaString;
        }

        savedFields.push(await fieldRepo.save(fieldEntity));
      }

      return savedFields;
    });
  }
}

export const dynamicFormService = new DynamicFormService();
