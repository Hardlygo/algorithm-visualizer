import React from 'react';
import { connect } from 'react-redux';
import { loadProgressBar } from 'axios-progress-bar'
import { CodeEditor, DescriptionViewer, Header, Navigator, ToastContainer, WikiViewer, } from '/components';
import { Workspace, WSSectionContainer, WSTabContainer } from '/workspace/components';
import { Section } from '/workspace/core';
import { actions as toastActions } from '/reducers/toast';
import { actions as envActions } from '/reducers/env';
import { GitHubApi, HierarchyApi } from '/apis';
import { tracerManager } from '/core';
import styles from './stylesheet.scss';
import 'axios-progress-bar/dist/nprogress.css'

loadProgressBar();

@connect(
  ({ toast, env }) => ({
    toast,
    env,
  }), {
    ...toastActions,
    ...envActions,
  }
)
class App extends React.Component {
  constructor(props) {
    super(props);

    this.spawnReference = Workspace.createReference();
    this.navigatorReference = Workspace.createReference();
  }

  componentDidMount() {
    this.updateDirectory(this.props.match.params);

    HierarchyApi.getHierarchy()
      .then(({ hierarchy }) => {
        this.props.setHierarchy(hierarchy);
        const { categoryKey, algorithmKey } = this.props.env;
        const category = hierarchy.find(category => category.key === categoryKey) || hierarchy[0];
        const algorithm = category.algorithms.find(algorithm => algorithm.key === algorithmKey) || category.algorithms[0];
        this.props.history.push(`/${category.key}/${algorithm.key}`);
      });

    const { signedIn, accessToken } = this.props.env;
    if (signedIn) GitHubApi.auth(accessToken);

    tracerManager.setOnRender(renderers => this.handleChangeRenderers(renderers));
    tracerManager.setOnError(error => this.props.showErrorToast(error.message));
  }

  componentWillUnmount() {
    tracerManager.setOnRender(null);
    tracerManager.setOnError(null);
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.match.params !== this.props.match.params) {
      this.updateDirectory(nextProps.match.params);
    }
  }

  updateDirectory({ categoryKey = null, algorithmKey = null }) {
    if (categoryKey && algorithmKey) {
      this.props.setDirectory(categoryKey, algorithmKey);
    }
  }

  handleChangeRenderers(renderers) {
    const oldSections = this.rendererSections || {};
    const newSections = {};
    for (const renderer of renderers) {
      const { tracerKey, element } = renderer;
      let section = null;
      if (tracerKey in oldSections) {
        section = oldSections[tracerKey];
        section.setElement(element);
        delete oldSections[tracerKey];
      } else {
        section = new Section(element);
        this.spawnReference.core.addChild(section);
      }
      newSections[tracerKey] = section;
    }
    Object.values(oldSections).forEach(tab => tab.remove());
    this.rendererSections = newSections;
  }

  render() {
    const { hierarchy, categoryKey, algorithmKey } = this.props.env;

    const navigatorOpened = true;

    return hierarchy && categoryKey && algorithmKey && (
      <div className={styles.app}>
        <Workspace className={styles.workspace} wsProps={{ horizontal: false }}>
          <Header wsProps={{
            removable: false,
            size: 32,
            fixed: true,
            resizable: false,
          }}
                  onClickTitleBar={() => this.navigatorReference.core.setVisible(!this.navigatorReference.core.visible)}
                  navigatorOpened={navigatorOpened} />
          <WSSectionContainer wsProps={{ fixed: true }}>
            <Navigator wsProps={{
              removable: false,
              size: 240,
              minSize: 120,
              reference: this.navigatorReference,
              fixed: true,
            }} />
            <WSTabContainer>
              <WikiViewer wsProps={{ title: 'Tracer API' }} />
              <WSSectionContainer wsProps={{
                title: 'Visualization',
                removable: false,
                horizontal: false,
                reference: this.spawnReference
              }} />
            </WSTabContainer>
            <WSTabContainer>
              <DescriptionViewer wsProps={{ title: 'Description' }} />
              <CodeEditor wsProps={{ title: 'code.js' }} />
            </WSTabContainer>
          </WSSectionContainer>
        </Workspace>
        <ToastContainer className={styles.toast_container} />
      </div>
    );
  }
}

export default App;