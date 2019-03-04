import { expect } from 'chai';
import SequelizeCrudModel from './SequelizeCrudModel';

describe('Sequelize crud model', () => {

  describe('queryOptions', () => {

    let model;
    beforeEach(() => model = new SequelizeCrudModel());

    const addressModel = {
      attributes: {
        id: {},
        city: {}
      }
    };

    const individualModel = {
      attributes: {
        id: {},
        name: {},
        birthdate: {}
      },
      associations: {
        address: { target: addressModel }
      }
    };

    const roleModel = {
      attributes: {
        id: {},
        name: {},
        key: {}
      }
    };

    const userModel = {
      attributes: {
        id: {},
        name: {}
      },
      associations: {
        individual: { target: individualModel },
        roles: { target: roleModel }
      }
    };

    describe('Empty projection', () => {

      it('Shallow', () => {
        const result = model.queryOptions(userModel);
        expect(result).to.deep.equal({
          duplicating: false,
          include: [
            { duplicating: false, association: 'individual' },
            { duplicating: false, association: 'roles' }
          ]
        });
      });

      it('Deep', () => {
        const result = model.queryOptions(userModel, { depthLevel: 2 });
        expect(result).to.deep.equal({
          duplicating: false,
          include: [
            {
              duplicating: false,
              association: 'individual',
              include: [{
                duplicating: false,
                association: 'address'
              }]
            },
            { duplicating: false, association: 'roles' }
          ]
        });
      });

    });

    describe('Inclusive', () => {

      it('One level deep', () => {
        const projection = ['individual', 'individual.address'];
        const result = model.queryOptions(userModel, { projection, depthLevel: 1 });
        expect(result).to.deep.equal({
          duplicating: false,
          include: [{
            duplicating: false,
            association: 'individual'
          }]
        });
      });

      it('Root level attribute', () => {
        const projection = ['name'];
        const result = model.queryOptions(userModel, { projection });
        expect(result).to.deep.equal({
          duplicating: false,
          attributes: ['name']
        });
      });

      it('Load nested by fields', () => {
        const projection = ['individual.name', 'individual.address.city'];
        const result = model.queryOptions(userModel, { projection, depthLevel: 2 });
        expect(result).to.deep.equal({
          duplicating: false,
          include: [
            {
              duplicating: false,
              association: 'individual',
              attributes: ['name'],
              include: [{
                duplicating: false,
                association: 'address',
                attributes: ['city']
              }]
            }
          ]
        });
      });

    });

    describe('Exclusive', () => {

      it('One level deep', () => {
        const projection = { exclusive: true, paths: ['name'] };
        const result = model.queryOptions(userModel, { projection });
        expect(result).to.deep.equal({
          duplicating: false,
          attributes: { exclude: ['name'] },
          include: [{
            duplicating: false,
            association: 'individual'
          }, {
            duplicating: false,
            association: 'roles'
          }]
        });
      });

      it('Exclude root property', () => {
        const projection = { exclusive: true, paths: ['name'] };
        const result = model.queryOptions(userModel, { projection, depthLevel: 2 });
        expect(result).to.deep.equal({
          duplicating: false,
          attributes: { exclude: ['name'] },
          include: [{
            duplicating: false,
            association: 'individual',
            include: [{
              duplicating: false,
              association: 'address',
            }]
          }, {
            duplicating: false,
            association: 'roles'
          }]
        });
      });

      it('Exclude deep nested property', () => {
        const projection = { exclusive: true, paths: ['individual.id', 'individual.address.id'] };
        const result = model.queryOptions(userModel, { projection, depthLevel: 2 });
        expect(result).to.deep.equal({
          duplicating: false,
          include: [{
            duplicating: false,
            association: 'individual',
            attributes: { exclude: ['id'] },
            include: [{
              duplicating: false,
              association: 'address',
              attributes: { exclude: ['id'] }
            }]
          }, {
            duplicating: false,
            association: 'roles'
          }]
        });
      });

    });

  });

  describe('cascadeFieldsToInclude', () => {

    let model;
    before(() => model = new SequelizeCrudModel());

    it('Flat', () => {
      expect(
          model.cascadeFieldsToInclude([
            { field: 'employees' },
            'individual'
          ])
      ).to.deep.equal([
        { association: 'employees' },
        'individual'
      ]);
    });

    it('One level nested', () => {
      expect(
          model.cascadeFieldsToInclude([
            { field: 'employees', cascadeFields: ['address'] },
            'individual'
          ])
      ).to.deep.equal([
        { association: 'employees', include: ['address'] },
        'individual'
      ]);
    });

    it('Deep nested', () => {
      expect(
          model.cascadeFieldsToInclude([{
            field: 'employees',
            cascadeFields: [{
              field: 'address',
              cascadeFields: ['city']
            }]
          }])
      ).to.deep.equal([{
        association: 'employees',
        include: [{
          association: 'address',
          include: ['city']
        }]
      }
      ]);
    });

  });

});