const FlowSymbols = {
    changeStateListener: Symbol('changeStateListener'),
    errorListener: Symbol('errorListener'),
    states: Symbol('states'),
    stateConfigs: Symbol('stateConfigs'),
    currentState: Symbol('currentState'),
    initialState: Symbol('initialState'),
    finalState: Symbol('finalState'),
    isPending: Symbol('isPending'),
    resolveMethod: Symbol('resolveMethod'),
    errors: Symbol('errors'),
    flowErrorMethod: Symbol('flowErrorMethod'),
    flowData: Symbol('flowData'),
    maxPendingMillisecondsTime: Symbol('maxPendingMillisecondsTime'),
    pendingTimeout: Symbol('pendingTimeout'),
    changeStateEvent: Symbol('changeStateEvent'),
    errorEvent: Symbol('errorEvent'),
    inProgress: Symbol('inProgress'),
    initial: Symbol('initial'),
    final: Symbol('final'),
    isCheckStateTransitions: Symbol('isCheckStateTransitions')
};

const noop = () => {};

class Flow {
    [ FlowSymbols.changeStateListener ] = null;
    [ FlowSymbols.states ] = null;
    [ FlowSymbols.stateConfigs ] = null;
    [ FlowSymbols.currentState ] = null;
    [ FlowSymbols.initialState ] = null;
    [ FlowSymbols.finalState ] = null;
    [ FlowSymbols.isPending ] = false;
    [ FlowSymbols.errors ] = {
        system: [],
        flow: []
    };
    [ FlowSymbols.inProgress ] = false;

    [ FlowSymbols.resolveMethod ] = (state) => {
        clearTimeout(this[FlowSymbols.pendingTimeout]);

        if (state) {
            if (this.currentState !== state) {
                if (this[FlowSymbols.isCheckStateTransitions] ? ~this[FlowSymbols.stateConfigs][this.currentState].transitions.indexOf(state) : true) {
                    if (this[FlowSymbols.stateConfigs][this.currentState].outcome instanceof Function) {
                        this[FlowSymbols.stateConfigs][this.currentState].outcome.apply(this, [ state, this[FlowSymbols.errors], this[FlowSymbols.flowData] ]);
                    }

                    this[FlowSymbols.currentState] = state;

                    if (this[FlowSymbols.stateConfigs][state].income instanceof Function) {
                        this[FlowSymbols.stateConfigs][state].income.apply(this, [ state, this[FlowSymbols.errors], this[FlowSymbols.flowData] ]);
                    }
                    this[FlowSymbols.changeStateEvent](state, this[FlowSymbols.errors], this[FlowSymbols.flowData]);
                } else {
                    this[FlowSymbols.errors].flow.push('Illegal flow transition');
                    this[FlowSymbols.changeStateEvent](this.currentState, this[FlowSymbols.errors], this[FlowSymbols.flowData]);
                }
            } else {
                this[FlowSymbols.changeStateEvent](this.currentState, this[FlowSymbols.errors], this[FlowSymbols.flowData]);
            }
        }

        if (this[FlowSymbols.errors].system.length || this[FlowSymbols.errors].flow.length) {
            this[FlowSymbols.errorEvent](this.currentState, this[FlowSymbols.errors], this[FlowSymbols.flowData]);
        }

        this[FlowSymbols.errors] = {
            system: [],
            flow: []
        };

        if (state === this[FlowSymbols.finalState]) {
            this[FlowSymbols.inProgress] = false;
            this[FlowSymbols.final].apply(this, [this[FlowSymbols.flowData], false]);
        }

        this[FlowSymbols.isPending] = false;
    }

    [ FlowSymbols.flowErrorMethod ] = (flowError) => {
        if (flowError) {
            this[FlowSymbols.errors].flow.push(flowError);
        }
    }

    [ FlowSymbols.changeStateEvent ] = (state, errors, flowData) => {
        this[FlowSymbols.changeStateListener].apply(this, [state, errors, flowData]);
    }

    [ FlowSymbols.errorEvent ] = (state, errors, flowData) => {
        this[FlowSymbols.errorListener].apply(this, [state, errors, flowData]);
    }

    constructor({ states, initialState, finalState, initialData = {}, maxPendingMillisecondsTime = null, initial = noop, final = noop, changeStateListener = noop, errorListener = noop, isCheckStateTransitions = true }) {
        this[FlowSymbols.stateConfigs] = states;
        this[FlowSymbols.states] = Object.keys(states);
        this[FlowSymbols.initialState] = initialState;
        this[FlowSymbols.finalState] = finalState;
        this[FlowSymbols.flowData] = initialData;
        this[FlowSymbols.maxPendingMillisecondsTime] = maxPendingMillisecondsTime;
        this[FlowSymbols.initial] = initial;
        this[FlowSymbols.final] = final;
        this[FlowSymbols.changeStateListener] = changeStateListener;
        this[FlowSymbols.errorListener] = errorListener;
        this[FlowSymbols.isCheckStateTransitions] = isCheckStateTransitions;
    }

    start(...args) {
        this[FlowSymbols.currentState] = this[FlowSymbols.initialState];
        this[FlowSymbols.inProgress] = true;
        try {
            this[FlowSymbols.initial].apply(this, [ this[FlowSymbols.flowData], ...args ]);
        } catch (systemError) {
            this[FlowSymbols.errors].system.push(systemError.toString());
        }
        this[FlowSymbols.changeStateEvent](this.currentState, this[FlowSymbols.errors], this[FlowSymbols.flowData]);
    }

    event(eventName, ...args) {
        if (!this[FlowSymbols.isPending] && this[FlowSymbols.inProgress]) {
            this[FlowSymbols.isPending] = true;

            const stateEvent = this[FlowSymbols.stateConfigs][this.currentState].events?.[eventName];

            if (stateEvent && stateEvent.handler) {
                let handling;

                if (this.maxPendingMillisecondsTime !== null) {
                    this[FlowSymbols.pendingTimeout] = setTimeout(() => {
                        this[FlowSymbols.errors].flow.push('Pending time is over');
                        this[FlowSymbols.resolveMethod](null);
                    }, this.maxPendingMillisecondsTime);
                }

                try {
                    handling = stateEvent.handler(
                        this[FlowSymbols.resolveMethod],
                        this[FlowSymbols.flowErrorMethod],
                        this[FlowSymbols.flowData],
                        ...args
                    );
                } catch (systemError) {
                    this[FlowSymbols.errors].system.push(systemError.toString());
                    this[FlowSymbols.resolveMethod](null);
                }

                if (handling instanceof Promise) {
                    handling.catch(systemError => {
                        this[FlowSymbols.errors].system.push(systemError.toString());
                        this[FlowSymbols.resolveMethod](null);
                    });
                }
            }
        }
    }

    stop() {
        this[FlowSymbols.isPending] = false;
        this[FlowSymbols.inProgress] = false;
        clearTimeout(this[FlowSymbols.pendingTimeout]);
        this[FlowSymbols.final].apply(this, [ this[FlowSymbols.flowData], true ]);
    }
    
    get maxPendingMillisecondsTime() {
        return this[FlowSymbols.maxPendingMillisecondsTime];
    }

    get isPending() {
        return this[FlowSymbols.isPending];
    }

    get isResolved() {
        return !this[FlowSymbols.isPending];
    }

    get inProgress() {
        return this[FlowSymbols.inProgress];
    }

    get states() {
        return [ ...this[FlowSymbols.states] ];
    }

    get currentState() {
        return this[FlowSymbols.currentState];
    }

    get possibleTransitions() {
        return [ ...this[FlowSymbols.stateConfigs][this.currentState].transitions ];
    }

    isValidTransition(state) {
        return !!~this[FlowSymbols.stateConfigs][this.currentState].transitions.indexOf(state);
    }

    get possibleEvents() {
        return Object.keys(this[FlowSymbols.stateConfigs][this.currentState].events);
    }

    isValidEvent(eventName) {
        return !!~Object.keys(this[FlowSymbols.stateConfigs][this.currentState].events).indexOf(eventName);
    }
}

module.exports = {
    Flow
}