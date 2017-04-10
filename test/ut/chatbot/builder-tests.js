import sinon from 'sinon';

import Builder from '../../../src/chatbot/builder.js';
import log from '../../../src/lib/logger-service';

var assert = require('assert');

describe('Chatbot builder', function() {
  beforeEach(function() {
    this.builder = new Builder({});
    this.builder.dialog('', [() => undefined]);
    this.session = {
      getInput: sinon.stub(),
      getUserData: sinon.stub(),
    };
  });

  describe('#intent', function() {
    it('should return the builder for call chaining', function() {
      const intentObj = {
        any: [/^foo/i, /^bar/i],
      };

      return expect(this.builder.intent('FOOBAR', intentObj))
        .to.equal(this.builder);
    });

    it('should register the intent with the given name', function() {
      const intentObj = {
        any: [/^foo/i, /^bar/i],
      };

      this.builder.intent('FOOBAR', intentObj);

      return expect(this.builder._intents['FOOBAR'])
        .to.deep.equal(intentObj);
    });

    it('should accept intent names prefixed with \'#\'', function() {
      const intentObj = {
        any: [/^foo/i, /^bar/i],
      };

      this.builder.intent('#FOOBAR', intentObj);

      return expect(this.builder._intents['FOOBAR'])
        .to.deep.equal(intentObj);
    });
  });

  describe('#run', function() {
    it('should return a Promise', function() {
      const ret = this.builder.run('SESSION', {}, {});

      expect(ret)
        .to.be.a('Promise');
    });

    it('should reset state if dialog does not exist', function() {
      const ret = this.builder.run('SESSION', {
        'state': '/foobar?666',
      }, 'moi');
      return expect(ret)
        .to.eventually
        .have.property('stateId', '');
    });
  });

  describe('#runAction', function() {
    it('should return a Promise', function() {
      const ret = this.builder.runAction({}, {}, {});

      expect(ret)
        .to.be.a('Promise');
    });

    it('should return an Error when there is no such actionId',
      function() {
        const action = 'UNDEFINED_ACTION';
        const ret = this.builder.runAction(action, {}, {});

        return expect(ret)
          .to.be.rejectedWith('No such action: ' + action);
      });

    it('should return a Promise if actionId is found', function() {
      this.builder.action('setInterest', () => ({}, {}, {}));
      const action = 'setInterest';
      const ret = this.builder.runAction(action, this.session, {});

      return expect(ret)
        .to.be.a('Promise');
    });

    it('should succeed even if the action throws', function() {
      const action = 'setInterest';
      const actionFn = sinon.stub()
        .throws(new Error());
      this.builder.action(action, actionFn);

      return expect(this.builder.runAction(action, this.session))
        .to.be.fulfilled;
    });
  });

  describe('#checkIntent', function() {
    it('should return false if intent is undefined', function() {
      const ret = this.builder.checkIntent('UNDEFINED_INTENT', this
        .session);

      return expect(ret)
        .to.be.false;
    });
  });

  describe('#getSubStateCount', function() {
    it('should return a 0 if tree stateId is undefined', function() {
      const stateId = 'UNDEFINED_STATEID';
      const ret = this.builder.getSubStateCount(stateId);

      return expect(ret)
        .to.equal(0);
    });
  });

  describe('#getStringTemplate', function() {
    it('should return the requested template', function() {
      const templateId = '@TEST_TEMPLATE';
      const template = 'foo {bar} baz';

      this.builder._strings[templateId] = template;

      return expect(this.builder.getStringTemplate(templateId))
        .to.equal(template);
    });

    it('should return the template id if no template can be found',
      function() {
        const templateId = '@TEST_TEMPLATE';

        return expect(this.builder.getStringTemplate(templateId))
          .to.equal(templateId);
      });
  });

  describe('#_matchIntentAny', function() {
    it('should match all intents in array in sequence', function() {
      const intents = ['foo', 'bar'];

      const matchIntentMock = sinon.mock(this.builder);
      matchIntentMock.expects('_matchIntent')
        .withArgs('foo', 'baz')
        .returns(null);
      matchIntentMock.expects('_matchIntent')
        .withArgs('bar', 'baz')
        .returns(null);

      this.builder._matchIntentAny(intents, 'baz');

    return matchIntentMock.verify();
    });
  });

  describe('#_runStep', function() {
    it('should return a Promise', function() {
      this.session.stateId = '';

      const ret = this.builder._runStep(0, this.session, 'message');

      expect(ret)
        .to.be.a('Promise');
      return expect(ret.catch(() => null))
        .to.be.fulfilled;
    });

    it('should run all actions before resolving', function() {
      const actions = ['foo', 'bar', 'baz'];

      this.session.stateId = '';
      this.session.subStateId = '0';
      this.session.runQueue = Promise.resolve();
      this.session.next = () => null;
      this.builder.dialog(
        '', [(session) => {
          for (let action of actions) {
            session.runQueue = session.runQueue.then(
              () => this.builder.runAction(action, this.session,
                '')
            );
          }
        }]
      );

      const results = [];
      for (let action of actions) {
        this.builder.action(action, () => {
          return new Promise((resolve, reject) => {
            setTimeout(
              () => {
                results.push(action);
                resolve({});
              },
              ~~(Math.random() * 10));
          });
        });
      }

      const ret = this.builder._runStep(0, this.session, 'message');

      return expect(ret)
        .to.be.fulfilled
        .then(() => expect(results)
          .to.deep.equal(actions));
    });
  });

  describe('#_matchIntentEach', function() {
    it('should try match all intents', function() {
      const intents = ['dead', 'beef'];

      const matchIntentMock = sinon.mock(this.builder);
      matchIntentMock.expects('_matchIntent')
        .withArgs('dead', 'dead beef')
        .returns(true);

      matchIntentMock.expects('_matchIntent')
        .withArgs('beef', 'dead beef')
        .returns(true);

      this.builder._matchIntentEach(intents, 'dead beef');

      return matchIntentMock.verify();
    });

    it('should trim input if it matches', function() {
      const intents = ['dead', 'beef'];

      const matchIntentMock = sinon.mock(this.builder);
      matchIntentMock.expects('_matchIntent')
        .withArgs('dead', 'dead beef')
        .returns(['dead']);

      matchIntentMock.expects('_matchIntent')
        .withArgs('beef', 'beef')
        .returns(true);

      this.builder._matchIntentEach(intents, 'dead beef');

      return matchIntentMock.verify();
    });

    it('should return null if match is null', function() {
      const intents = ['dead', 'beef'];

      const matchIntentMock = sinon.mock(this.builder);
      matchIntentMock.expects('_matchIntent')
          .withArgs('dead', 'dead beef')
          .returns(null);

      const ret = this.builder._matchIntentEach(intents, 'dead beef');

      assert(ret === null);
    });
  });

  describe('#_matchIntent', function() {
    it('should use _runIntent() if input is a string', function() {
      const intentObject = 'dead';
      const input = 'dead';

      const runIntentMock = sinon.mock(this.builder);
      runIntentMock.expects('_runIntent')
        .withArgs(intentObject, input)
        .returns(true);

      this.builder._matchIntent(intentObject, input);

      return runIntentMock.verify();
    });

    it('should use exec() on intentObj', function() {
      const mockObject = { exec: function(i) { return 0; }};
      const input = 'dead';

      const ret = this.builder._matchIntent(mockObject, input);
      assert(ret === 0);
    });
  });
});
