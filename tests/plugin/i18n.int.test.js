import env from "../../src/config/env"; // eslint-disable-line no-unused-vars
import mongoose, { Schema } from "mongoose";
import mongooseUniqueValidator from "mongoose-unique-validator";
import chai, { expect } from "chai";
import chaiAsPromised from "chai-as-promised";
import { createI18n } from '../../src/config/i18n';
import i18nPlugin from "../../src/plugin/i18n";

chai.use(chaiAsPromised);

mongoose.set("debug", true);

describe("i18n plugin", () => {

    const userSchema = new Schema({
        firstName: {
            type: String,
            required: true,
            match: /^\w+$/,
        },
        lastName: {
            type: String,
            required: true,
            match: /^\w+$/,
        },
        email: {
            type: String,
            lowercase: true,
            unique: true,
        },
        phoneNumber: {
            type: String,
            unique: true,
        }
    });

    const userTranslations = {
        firstName: {
            name: "First name"
        },
        lastName: {
            name: "Last name",
            validation: {
                required: "`Last name` is required custom",
                regexp: "`Last name` is invalid custom"
            }
        },
        email: {
            name: "Email"
        },
        phoneNumber: {
            name: "Phone number",
            validation: {
                unique: "`Phone number` is not unique custom"
            }
        }
    };

    const bill = { firstName: "Bill", lastName: "Gates" };

    let connection, User, i18n;
    before(async () => {
        userSchema.plugin(mongooseUniqueValidator);
        userSchema.plugin(i18nPlugin);
        i18n = createI18n();
        i18n.addResourceBundle("en", "model.User", userTranslations);
        connection = await mongoose.createConnection(`${process.env.DB_URL}/i18nPluginTest`, { useNewUrlParser: true });
        User = connection.model("User", userSchema);
    });
    after(async () => {
        await connection.dropDatabase();
        await connection.close(true);
    });
    const dropCollection = async () => await User.deleteMany({ });
    beforeEach(dropCollection);
    afterEach(dropCollection);

    const checkError = (err, errCount, ...fields) => {
        expect(err.message).to.equal("Validation failed");
        const { errors } = err;
        expect(errors).to.be.ok;
        expect(Object.keys(errors).length).to.equal(errCount);
        fields.forEach(field => {
            expect(errors[field.name]).not.to.be.undefined;
            expect(errors[field.name].message).to.equal(field.value);
        });
    };

    it('Add user with empty fields', async () => {
        const err = await expect(new User({ }).setOptions({ i18n }).save()).to.be.eventually.rejected;
        checkError(
            err,
            2,
            { name: "firstName", value: "`First name` is required" },
            { name: "lastName", value: "`Last name` is required custom" }
        );
    });

    it('Add user with wrong first name', async () => {
        const err = await expect(new User({ ...bill, firstName: "+=-!", lastName: "**/+" }).setOptions({ i18n }).save()).to.be.eventually.rejected;
        checkError(
            err,
            2,
            { name: "firstName", value: "`First name` is invalid" },
            { name: "lastName", value: "`Last name` is invalid custom" }
        );
    });

    it('Add non-unique email', async () => {
        const extendedDoc = { ...bill, email: "mail@mailbox.com", phoneNumber: "+123456" };
        await new User(extendedDoc).save();
        const err = await expect(new User(extendedDoc).setOptions({ i18n }).save()).to.be.eventually.rejected;
        checkError(
            err,
            2,
            { name: "email", value: "`Email` is not unique" },
            { name: "phoneNumber", value: "`Phone number` is not unique custom" }
        );
        await expect(new User({ ...extendedDoc, email: "mail2@mailbox.com", phoneNumber: "+321" }).setOptions({ i18n }).save()).to.be.eventually.fulfilled;
    });

    it('Update existing entry with wrong values', async () => {
        const extendedDoc = { ...bill, email: "mail@mailbox.com", phoneNumber: "+123456" };
        await new User(extendedDoc).save();
        const instance = await new User({ ...extendedDoc, email: "mail2@mailbox.com", phoneNumber: "+321" }).save();
        const err = await expect(User.findOneAndUpdate(
            { _id: instance.id },
            { ...extendedDoc, firstName: "/*+-" },
            { runValidators: true, context: 'query', i18n }
        )).to.be.eventually.rejected;
        checkError(
            err,
            3,
            { name: "firstName", value: "`First name` is invalid" },
            { name: "email", value: "`Email` is not unique" },
            { name: "phoneNumber", value: "`Phone number` is not unique custom" }
        );
    });

});