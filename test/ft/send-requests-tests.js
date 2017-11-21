import commonFeatures from './common';
import PairFormatter from '../../src/lib/pair-formatter';
import PersonalInformationFormatter from
'../../src/lib/personal-information-formatter-service';
const { buildResponse, setupChatbot, FeatureTestStates, QuickReplies } = commonFeatures;

const SESSION = 'NEXT_TESTER';

describe('Send request tests', function () {
  describe(
    'As a registered user I want to show the next available peer without denying or accepting a pair',
    function () {
      before(function () {
        setupChatbot(this, 'SEND_REQUEST_TESTS');
      });

      it('Should show the first available peer', function () {
        return expect(
          this.bot.receive(SESSION, 'Etsi vertaisohjaajaa'))
          .to.eventually.become([
            buildResponse('@INFORMATION_ABOUT_LIST'),
            buildResponse('Parinhakija: 1/2'),
            buildResponse(
              PairFormatter.beautifyAvailablePairs(
                [{
                  id: '104',
                  context: FeatureTestStates['NEXT_TESTS']['sessions']['104'],
                }]),
              QuickReplies.createArray(['@YES', '@NO', '@NEXT', '@EXIT',])
            ),
          ]);
      });

      it('Should show the next available peer', function () {
        return expect(
          this.bot.receive(SESSION, 'Seuraava'))
          .to.eventually.become([
            buildResponse('Parinhakija: 2/2'),
            buildResponse(
              PairFormatter.beautifyAvailablePairs(
                [{
                  id: '105',
                  context: FeatureTestStates['NEXT_TESTS']['sessions']['105'],
                }]),
              QuickReplies.createArray(['@YES', '@NO', '@NEXT', '@EXIT',])
            ),
          ]);PersonalInformationFormatter
      });

      it('Should show the next available peer', function () {
        return expect(
          this.bot.receive(SESSION, 'Kyllä'))
          .to.eventually.become([
            buildResponse('@CONFIRM_NEW_PEER_ASK'),
            buildResponse('Parinhakija: 1/1'),
            buildResponse(
              PairFormatter.beautifyAvailablePairs(
                [{
                  id: '104',
                  context: FeatureTestStates['NEXT_TESTS']['sessions']['104'],
                }]),
              QuickReplies.createArray(['@YES', '@NO', '@NEXT', '@EXIT',])
            ),
          ]);
      });

      it('Should remove an available peer', function () {
        return expect(
          this.bot.receive(SESSION, 'Ei'))
          .to.eventually.become([
            buildResponse('@NO_PAIRS_AVAILABLE',
              QuickReplies.createArray(['@LIST_AS_SEARCHING', '@TO_PROFILE']))
          ]);
      });

      it('should go to profile', function () {
        return expect(
          this.bot.receive(SESSION, 'Profiiliin'))
          .to.eventually.become([
            buildResponse(
              PersonalInformationFormatter.formatFromTemplate(
                '@DISPLAY_PROFILE', FeatureTestStates['NEXT_TESTS']['sessions'][SESSION]),
              PersonalInformationFormatter.getPersonalInformationbuttons(
                {})),
          ]);
      });
    })
});
