import { security, validator, unauthorized } from "./middleware";
import chai, { expect } from "chai";
import sinonChai from "sinon-chai";
import { fake } from "sinon";

chai.use(sinonChai);

class StubResponse {
    constructor(user) {
        this.locals = { user };
        this.status = fake();
        this.json = fake();
    }
}

describe("Middleware", () => {

    describe("Permissions", () => {
        
        let user, res, next;

        beforeEach(() => {
            user = { roles: ["USER"] };
            res = new StubResponse(user);
            next = new fake();
        });

        it("Granted read", () => {
            const schema = { "USER": { read: true } };
            const middleware = security(schema);
            middleware({ }, res, next);
            expect(res.locals.permissions).to.be.ok;
            expect(next).to.have.been.called;
        });

        describe("Denied", () => {

            const schema = { };
            const middleware = security(schema);

            const checkIfAccessIsDenied = (middleware, res, method) => {
                middleware({ method }, res, next);
                expect(res.status).to.have.been.calledWith(403);
                expect(res.json).to.have.been.calledWith({ message: "Access is denied" });
            };

            it("Denied create", () => {
                checkIfAccessIsDenied(middleware, res, "POST");
            });
        
            it("Denied read", () => {
                checkIfAccessIsDenied(middleware, res, "GET");
            });

            it("Denied update", () => {
                checkIfAccessIsDenied(middleware, res, "PUT");
            });
        
            it("Denied delete", () => {
                checkIfAccessIsDenied(middleware, res, "DELETE");
            });

        });

    });

    describe("Validator", () => {

        const validationErrorPart = { message: "Validation failed" };

        it("Success", () => {
            const constraints = { field: { presence: true } };
            const next = fake();
            const middleware = validator(constraints);
            const res = new StubResponse({});
            middleware({ body: { field: "Bill" } }, res, next);
            expect(res.status).to.not.have.been.called;
            expect(res.json).to.not.have.been.called;
            expect(next).to.have.been.called;
        });

        it("Fail with options", () => {
            const constraints = { field: { presence: true } };
            const next = fake();
            const middleware = validator(constraints, { format: "flat" });
            const res = new StubResponse({});
            middleware({ body: { } }, res, next);
            expect(res.status).to.have.been.calledWith(400);
            expect(res.json).to.have.been.calledWith({ ...validationErrorPart, errors: ["Field can't be blank"] });
            expect(next).to.not.have.been.called;
        });

        it("Fail with custom validator", () => {
            const constraints = { field: { custom: true } };
            const custom = () => "is wrong";
            const next = fake();
            const middleware = validator(constraints, { format: "flat", validators: { custom } });
            const res = new StubResponse({});
            middleware({ body: { } }, res, next);
            expect(res.status).to.have.been.calledWith(400);
            expect(res.json).to.have.been.calledWith({ ...validationErrorPart, errors: ["Field is wrong"] });
            expect(next).to.not.have.been.called;
        });

    });

    describe("Unauthorized", () => {

        it("Success", () => {
            const next = fake();
            const middleware = unauthorized();
            const res = new StubResponse({});
            middleware({}, res, next);
            expect(res.status).to.not.have.been.called;
            expect(res.json).to.not.have.been.called;
            expect(next).to.have.been.called;
        });

        it("Fail", () => {
            const next = fake();
            const middleware = unauthorized();
            const res = new StubResponse();
            middleware({}, res, next);
            expect(res.status).to.have.been.calledWith(401);
            expect(res.json).to.have.been.calledWith({ message: "Unathorized" });
            expect(next).to.not.have.been.called;
        });

    });

});

