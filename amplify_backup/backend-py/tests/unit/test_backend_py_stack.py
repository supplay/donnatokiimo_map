import aws_cdk as core
import aws_cdk.assertions as assertions

from backend_py.backend_py_stack import BackendPyStack

# example tests. To run these tests, uncomment this file along with the example
# resource in backend_py/backend_py_stack.py
def test_sqs_queue_created():
    app = core.App()
    stack = BackendPyStack(app, "backend-py")
    template = assertions.Template.from_stack(stack)

#     template.has_resource_properties("AWS::SQS::Queue", {
#         "VisibilityTimeout": 300
#     })
