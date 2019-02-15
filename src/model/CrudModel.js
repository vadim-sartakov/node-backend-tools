import { filterObject, createProjection } from "common-tools";

const defaultPermissions = { create: { }, read: { }, update: { }, delete: { } };

class CrudModel {

  constructor({ excerptProjection, searchFields, loadFields, cascadeFields }) {
    this.excerptProjection = excerptProjection;
    this.searchFields = searchFields;
    this.loadFields = loadFields;
    this.cascadeFields = cascadeFields;
  }

  async getAll({ page = 0, size = 20, filter, sort }, permissions) {
    permissions = { ...defaultPermissions, ...permissions };
    const { read: { filter: permissionFilter, projection: permissionProjection } } = permissions;
    let projection = this.getReadProjection(permissionProjection);
    if (projection) projection = createProjection(projection);
    const resultFilter = this.getResultFilter(filter, permissionFilter);
    return await this.execGetAll({
      page,
      size,
      projection,
      filter: resultFilter,
      sort
    });
  }

  getResultFilter(queryFilter, permissionFilter) {

    if (queryFilter && queryFilter.search && this.searchFields) {
      const search = Array.isArray(this.searchFields) ? this.searchFields : [this.searchFields];
      Object.assign(queryFilter, { $or: [...this.searchFieldsToFilter(search, queryFilter.search)] });
      delete queryFilter.search;
    }
    const filterArray = [];
    if (permissionFilter) filterArray.push(permissionFilter);
    if (queryFilter) filterArray.push(queryFilter);
    let resultFilter;
    switch (filterArray.length) {
      case 1:
        resultFilter = filterArray[0];
        break;
      case 2:
        resultFilter = { $and: filterArray };
        break;
      default:
    }
    return resultFilter;
  }

  getReadProjection(permissionProjection) {
    return this.excerptProjection || permissionProjection;
  }

  async count(filter, permissions) {
      permissions = { ...defaultPermissions, ...permissions };
      const { read: { filter: permissionFilter } } = permissions;
      const resultFilter = this.getResultFilter(filter, permissionFilter);
      return await this.execCount(resultFilter);
  }

  async addOne(payload, permissions) {
      permissions = { ...defaultPermissions, ...permissions };
      const { update: { projection } } = permissions;
      if (projection) payload = filterObject(payload, projection);
      return this.execAddOne(payload);
  }

  async getOne(filter, permissions) {
      if (this.underscoredId) filter = this.addIdUnderscore(filter);
      permissions = { ...defaultPermissions, ...permissions };
      const { read: { filter: permissionFilter, projection: permissionProjection } } = permissions;
      let projection = this.getReadProjection(permissionProjection);
      if (projection) projection = createProjection(projection);
      const resultFilter = this.getResultFilter(filter, permissionFilter);
      return await this.execGetOne({ filter: resultFilter, projection });
  }

  addIdUnderscore(filter) {
      let result;
      if (filter && filter.id) {
          result = { ...filter };
          result._id = result.id;
          delete result.id;
      }
      return result;
  }

  async updateOne(filter, payload, permissions) {
      if (this.underscoredId) filter = this.addIdUnderscore(filter);
      permissions = { ...defaultPermissions, ...permissions };
      const { read: { filter: permissionFilter }, update: { projection } } = permissions;
      if (projection) {
          const initialObject = await this.execGetOne(filter);
          payload = filterObject(payload, projection, initialObject);
      }
      const resultFilter = this.getResultFilter(filter, permissionFilter);
      return await this.execUpdateOne(resultFilter, payload);
  }

  async deleteOne(filter, permissions) {
      if (this.underscoredId) filter = this.addIdUnderscore(filter);
      permissions = { ...defaultPermissions, ...permissions };
      const { read: { filter: permissionFilter } } = permissions;
      const resultFilter = this.getResultFilter(filter, permissionFilter);
      return await this.execDeleteOne(resultFilter);
  }

}

export default CrudModel;