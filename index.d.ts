type StateFlowErrors = {
    flow: string[];
    system: string[];
};

type FlowArguments = {
    states: {
        [key: string | number | symbol]: {
            income?: (state: string, errors: StateFlowErrors, flowData: any, ...args: any[]) => void;
            outcome?: (state: string, errors: StateFlowErrors, flowData: any, ...args: any[]) => void;
            transitions?: string[];
            events?: {
                [key: string | number | symbol]: {
                    handler: (state: string, errors: StateFlowErrors, flowData: any, ...args: any[]) => Promise<any> | void;
                };
            };
        };
    };
    initialState: string;
    finalState: string;
    initial?: (...args: any[]) => void;
    final?: (...args: any[]) => void;
    initialData?: any;
    maxPendingMillisecondsTime?: number;
    changeStateListener?: (state: string, errors: StateFlowErrors, flowData: any) => void;
    errorListener?: (state: string, errors: StateFlowErrors, flowData: any) => void;
    isCheckStateTransitions?: boolean;
};

export class Flow {
    constructor(props: FlowArguments);
    start(...args: any[]): void;
    event(eventName: string | number | symbol, ...args: any[]): void;
    stop(): void;
    get maxPendingMillisecondsTime(): number | null;
    get isPending(): boolean;
    get isResolved(): boolean;
    get inProgress(): boolean;
    get states(): string[];
    get currentState(): string;
    get possibleTransitions(): string[];
    isValidTransition(state: string): boolean;
    get possibleEvents(): string[];
    isValidEvent(eventName: string): boolean;
}

