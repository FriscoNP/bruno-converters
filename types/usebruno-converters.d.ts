declare module "@usebruno/converters" {
  export function postmanToBruno(postmanCollection: object): unknown;
}

declare module "@usebruno/converters/src/insomnia/insomnia-to-bruno" {
  export default function insomniaToBruno(insomniaCollection: object): unknown;
}

declare module "@usebruno/converters/src/openapi/openapi-to-bruno" {
  export default function openApiToBruno(openApiSpec: object): unknown;
}

declare module "@usebruno/converters/src/wsdl/wsdl-to-bruno" {
  export default function wsdlToBruno(wsdlContent: string): Promise<unknown>;
}
